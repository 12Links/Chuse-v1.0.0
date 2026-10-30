import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "..", "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main_fastapi import app, api_v1_router

# Include router under /api/py prefix for Vercel serverless rewrites
app.include_router(api_v1_router, prefix="/api/py")

@app.get("/api/py")
def py_root():
    return {
        "service": "Chuse South African Retail Engine (FastAPI)",
        "status": "online",
        "version": "1.0.0",
        "docs": "/api/py/docs"
    }

@app.get("/api/py/health")
def py_health():
    return {"status": "healthy"}
