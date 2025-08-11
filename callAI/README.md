Tripmate Call AI (Twilio + FastAPI)

Setup

- Requirements are in requirements.txt. Create a venv and install.
- Add a .env file (or export in your shell) with:
	- TWILIO_ACCOUNT_SID=...
	- TWILIO_AUTH_TOKEN=...
	- TWILIO_PHONE_NUMBER=...
	- GEMINI_API_KEY=...
	- TWILIO_WS_URL=wss://<your-ngrok-domain>/twilio/ws
	- SUPABASE_URL=...
	- SUPABASE_SERVICE_ROLE_KEY=...  # or SUPABASE_ANON_KEY
	- SUPABASE_TABLE_NAME=emergencies

Run

- Start the API: uvicorn callAI.main:app --host 0.0.0.0 --port 8000
- Expose with ngrok and configure your Twilio Voice webhook to POST to:
	- https://<your-ngrok-domain>/twilio/voice
- Make sure TWILIO_WS_URL matches your wss endpoint.

Notes

- The assistant is travel-focused and keeps one Gemini chat session.
- If GEMINI_API_KEY is missing, the call will reply with a short fallback line instead of failing.
- The model returns JSON with { location, emergency, output }. The code stores location and emergency in Supabase and uses output for TTS.
