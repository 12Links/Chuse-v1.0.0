import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Ensure backend directory is in python search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from app.database import engine, Base
import app.models  # Register SQLAlchemy models
from app.routers.api_v1 import router as api_v1_router

# Synchronize database tables if possible
try:
    Base.metadata.create_all(bind=engine)
    print("[Database] SQLAlchemy tables initialized.")
except Exception as e:
    print(f"[Database] Warning initializing tables: {e}")

app = FastAPI(
    title="Chuse API",
    description="South African multi-supermarket bento price comparison engine API",
    version="1.0.0"
)

# Enable CORS for local web development & Capacitor mobile requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)

@app.get("/")
def root():
    return {
        "service": "Chuse South African Retail Engine",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.environ.get("FASTAPI_PORT", os.environ.get("BACKEND_PORT", 8000)))
    print(f"Starting Chuse FastAPI server on port {port}...")
    uvicorn.run("main_fastapi:app", host="0.0.0.0", port=port, reload=False)
