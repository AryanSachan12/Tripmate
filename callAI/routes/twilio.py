from fastapi import APIRouter, WebSocket, Request
from fastapi.responses import Response
from twilio.twiml.voice_response import VoiceResponse, Connect
from twilio.rest import Client
import base64
import pywav
import numpy as np
import subprocess
from gtts import gTTS
import os
import whisper
from websockets.exceptions import ConnectionClosed
import google.generativeai as genai
import asyncio
import json
import re
from typing import Optional, Tuple, Any
import importlib
create_client = None

router = APIRouter(prefix="/twilio", tags=["twilio"]) 

TEXT = ""
AUDIO_FILE = "twilio_audio.wav"
AUDIO_BUFFER = bytearray()
BUFFER_DURATION = 8
STREAM_SID = ""
CALLER_NUMBER: Optional[str] = None

model = whisper.load_model("small")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
WS_URL = os.getenv("TWILIO_WS_URL", "wss://surely-tight-bullfrog.ngrok-free.app/twilio/ws")

generation_config = {
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "text/plain",
}

TRAVEL_SYSTEM_INSTRUCTION = (
  "You are an SOS emergency help agent. Extract JSON only with keys: location (string), emergency (string), and output (string).\n"
  "Return strictly a JSON object, no extra text. Example: {\"location\":\"Chandni Chowk, New Delhi\",\"emergency\":\"thief stole my phone\",\"output\":\"I have sent the information ...\"}"
)

_model = None
_chat_session = None
_supabase: Optional[Any] = None


def _ensure_genai() -> bool:
  api = os.getenv("GEMINI_API_KEY")
  if not api:
    return False
  genai.configure(api_key=api)
  return True


def _get_chat_session():
  global _model, _chat_session
  if _chat_session is not None and _model is not None:
    return _chat_session
  if not _ensure_genai():
    return None
  _model = genai.GenerativeModel(
  model_name="gemini-2.5-flash",
    generation_config=generation_config,
    system_instruction=TRAVEL_SYSTEM_INSTRUCTION,
  )
  _chat_session = _model.start_chat(
    history=[
      {
        "role": "user",
        "parts": [
          "I am at Chandni Chowk, New Delhi, a thief just stole my phone.",
        ],
      },
      {
        "role": "model",
        "parts": [
          "{ \"location\": \"Chandni Chowk, New Delhi\", \"emergency\": \"thief stole my phone\", \"output\": \"I have sent the information about this theft to relevant authorities, help will be on the way\" }",
        ],
      },
    ]
  )
  return _chat_session


def _get_supabase() -> Optional[Any]:
  global _supabase
  if _supabase is not None:
    return _supabase
  global create_client
  if create_client is None:
    try:
      supa = importlib.import_module("supabase")
      create_client = getattr(supa, "create_client", None)
    except Exception:
      create_client = None
  if create_client is None:
    print("Supabase client not available. Install 'supabase' package.")
    return None
  url = os.getenv("SUPABASE_URL")
  key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
  if not url or not key:
    print("Supabase env vars missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/ANON_KEY")
    return None
  try:
    _supabase = create_client(url, key)
    return _supabase
  except Exception as e:
    print("Failed to init Supabase:", e)
    return None


def _extract_json(text: str) -> Optional[dict]:
  if not text:
    return None
  # Strip code fences if present
  fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
  raw = fenced.group(1) if fenced else text
  # Try direct JSON parse; fallback to first JSON object substring
  try:
    return json.loads(raw)
  except Exception:
    obj_match = re.search(r"\{[\s\S]*\}", raw)
    if obj_match:
      try:
        return json.loads(obj_match.group(0))
      except Exception:
        return None
    return None


def _store_emergency(location: Optional[str], emergency: Optional[str], model_json: Optional[dict] = None, mobile_no: Optional[str] = None) -> bool:
  if not location and not emergency:
    return False
  sb = _get_supabase()
  if sb is None:
    return False
  table = os.getenv("SUPABASE_TABLE_NAME", "emergencies")
  try:
    payload = {k: v for k, v in {
      "location": location,
      "emergency": emergency,
      "mobile_no": mobile_no,
      "model_response": model_json,
    }.items() if v is not None}
    sb.table(table).insert(payload).execute()
    print("✅ Stored emergency in Supabase:", payload)
    return True
  except Exception as e:
    print("❌ Supabase insert failed (first attempt):", e)
    try:
      if "model_response" in payload:
        payload2 = {k: v for k, v in payload.items() if k != "model_response"}
        sb.table(table).insert(payload2).execute()
        print("✅ Stored emergency without model_response:", payload2)
        return True
    except Exception as e2:
      print("❌ Supabase insert failed (fallback):", e2)
    return False


@router.post("/voice")
async def handle_incoming_call(request: Request):
  """Handles incoming call and starts WebSocket stream"""
  response = VoiceResponse()

  response.say("Hello, I’m your Tripmate travel assistant! What's the emergency?")

  start = Connect()
  # Twilio posts form-encoded data; read it via FastAPI Request
  global CALLER_NUMBER
  try:
    form = await request.form()
    CALLER_NUMBER = form.get('From')
    print(f"Call from: {CALLER_NUMBER}")
  except Exception as e:
    print("Failed to read caller number:", e)

  start.stream(url=WS_URL)
  response.append(start)

  response.say("Thanks for planning with Tripmate. Goodbye!")

  return Response(content=str(response), media_type="application/xml")


async def save_mulaw_to_wav(audio_bytes, filename=AUDIO_FILE):
  wave_write = pywav.WavWrite(filename, 1, 8000, 8, 7)
  wave_write.write(audio_bytes)
  wave_write.close()
  return await transcribe_audio(filename)


async def transcribe_audio(filename):
  global TEXT

  result = model.transcribe(filename)
  user_text = result.get("text", "").strip()
  TEXT += "User: " + user_text + "\n"

  session = _get_chat_session()
  if session is None:
    fallback = "Tripmate setup issue: missing GEMINI_API_KEY. Please set it and retry."
    TEXT += "Model: " + fallback + "\n"
    return fallback

  response = session.send_message(TEXT)
  resp_text = getattr(response, "text", "").strip()
  TEXT += "Model: " + resp_text + "\n"

  # Parse JSON and store to Supabase
  parsed = _extract_json(resp_text)
  if parsed and isinstance(parsed, dict):
    location = parsed.get("location")
    emergency = parsed.get("emergency")
    output = parsed.get("output") or "Help request noted."
  _store_emergency(location, emergency, model_json=parsed, mobile_no=CALLER_NUMBER)
  print("✅ Emergency stored:", parsed)
  return output

  # Fallback to raw text if parsing fails
  return resp_text or "Help request noted."


def mulaw_decode(audio_bytes, quantization_channels=256):
  mu = quantization_channels - 1
  signal = np.frombuffer(audio_bytes, dtype=np.uint8)
  signal = 2 * (signal.astype(np.float32) / mu) - 1
  signal = np.sign(signal) * (1 / mu) * ((1 + mu) ** np.abs(signal) - 1)
  return (signal * 32767).astype(np.int16)


def convert_mulaw_to_wav(audio_bytes):
  pcm_data = mulaw_decode(audio_bytes)
  pcm_float = pcm_data.astype(np.float32) / 32768.0
  return pcm_float


def transcribe_audio_chunk(pcm_array):
  try:
    pcm_array = np.array(pcm_array, dtype=np.float32)
    result = model.transcribe(pcm_array, fp16=False)
    return result["text"]
  except Exception as e:
    print("❌ Whisper Error:", e)
    return ""


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
  await websocket.accept()
  print("✅ Twilio WebSocket Connected")

  audio_data = b""

  global AUDIO_BUFFER, STREAM_SID, TEXT

  try:
    while True:
      data = await websocket.receive_json()

      event = data.get("event")

      if event == "start":
        STREAM_SID = data.get("streamSid")
        print("🟢 Starting audio recording")
      elif event == "media":
        audio_chunk = base64.b64decode(data["media"]["payload"])
        audio_data += audio_chunk
        AUDIO_BUFFER.extend(audio_chunk)
        if len(AUDIO_BUFFER) >= 60000:
          response_text = await save_mulaw_to_wav(AUDIO_BUFFER, f"twilio_audio.wav")

          response_text = response_text or "Message Received."
          tts = gTTS(text=response_text)
          tts.save("output.mp3")

          subprocess.run([
            "ffmpeg", "-y", "-i", "output.mp3",
            "-ar", "8000", "-ac", "1",
            "-c:a", "pcm_mulaw", "-f", "mulaw", "output.raw"
          ], check=True)

          with open("output.raw", "rb") as f:
            audio_raw = f.read()

          with open("debug_output.raw", "wb") as f:
            f.write(audio_raw)

          encoded_audio = base64.b64encode(audio_raw).decode("utf-8")
          objA = {"event": "media", "streamSid": STREAM_SID, "media": {"payload": encoded_audio}}
          objB = {"event": "mark", "streamSid": STREAM_SID, "mark": {"name": "message"}}
          await websocket.send_json(objA)
          await websocket.send_json(objB)

          print("✅ Sent Audio response to Twilio.")

          AUDIO_BUFFER = bytearray()

          await asyncio.sleep(30)
      elif event == "mark":
        print("🔵 Mark:", data["mark"]["name"])
      elif event == "stop":
        print("🔴 Stopping audio recording")
        break
  except ConnectionClosed:
    print("🔴 WebSocket Disconnected")

  await save_mulaw_to_wav(audio_data)
  print(TEXT)
  print("✅ WAV file saved successfully!")

  await websocket.close()