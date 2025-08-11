from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.twilio import router as twilio_router
from routes.ml import router as ml_router
import os
from dotenv import load_dotenv
import importlib

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(twilio_router)
app.include_router(ml_router)   

@app.get("/health/supabase")
def health_supabase():
    try:
        supa = importlib.import_module("supabase")
        create_client = getattr(supa, "create_client", None)
        if not create_client:
            return {"ok": False, "error": "supabase client not installed"}
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            return {"ok": False, "error": "missing env SUPABASE_URL and key"}
        client = create_client(url, key)
        # simple no-op call: select 0 rows from a known table name if provided
        table = os.getenv("SUPABASE_TABLE_NAME", "emergencies")
        try:
            client.table(table).select("*").limit(0).execute()
            return {"ok": True, "table": table}
        except Exception as e:
            return {"ok": True, "warning": f"connected but table check failed: {e}", "table": table}
    except Exception as e:
        return {"ok": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)