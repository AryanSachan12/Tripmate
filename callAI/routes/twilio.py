from fastapi import APIRouter, WebSocket
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

router = APIRouter(prefix="/twilio", tags=["twilio"]) 

# State
TEXT = ""
AUDIO_FILE = "twilio_audio.wav"
AUDIO_BUFFER = bytearray()
BUFFER_DURATION = 8
FILE_NO = 0
STREAM_SID = ""

# Whisper ASR
model = whisper.load_model("small")

# Twilio
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Gemini
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
  "You are an expert AI Travel Assistant for Tripmate. Help users plan trips: suggest destinations, concise itineraries, flights and stays tips, budget ranges, visa notes, local transport, safety, and weather.\n\n"
  "Keep answers practical and specific to origin, dates, budget, interests, and travelers. If details are missing, assume reasonably and say so.\n\n"
  "Reply as one short paragraph under 100 words suitable for TTS, conversational and friendly."
)

_model = None
_chat_session = None


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
          "Help me plan a short beach getaway in September",
        ],
      },
      {
        "role": "model",
        "parts": [
          "A September beach break works well in Goa or Gokarna. Fly into GOI, stay near Palolem or Benaulim, rent a scooter, and plan sunrise beaches, spice farm, and seafood. Expect 28–30°C with occasional showers. Pick homestays for value and walkable access.",
        ],
      },
    ]
  )
  return _chat_session


@router.post("/voice")
async def handle_incoming_call():
  """Handles incoming call and starts WebSocket stream"""
  response = VoiceResponse()

  response.say("Hello, I’m your Tripmate travel assistant! Where and when would you like to travel?")

  start = Connect()
  # Use env var TWILIO_WS_URL to point to your wss endpoint
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
  # Transcribe with Whisper (lang auto)
  result = model.transcribe(filename)
  TEXT += "User: " + result["text"] + "\n"

  session = _get_chat_session()
  if session is None:
    fallback = "Tripmate setup issue: missing GEMINI_API_KEY. Please set it and retry."
    TEXT += "Model: " + fallback + "\n"
    return fallback

  response = session.send_message(TEXT)
  TEXT += "Model: " + response.text + "\n"
  return response.text


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

  global AUDIO_BUFFER, FILE_NO, STREAM_SID, TEXT

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
        if len(AUDIO_BUFFER) >= 30000:
          if FILE_NO < 2:
            response_text = await save_mulaw_to_wav(AUDIO_BUFFER, f"twilio_audio_{FILE_NO}.wav")
          elif FILE_NO == 2:
            response_text = "Got it. I’ve drafted your trip plan; you’ll receive details shortly."

          FILE_NO += 1

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