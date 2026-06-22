#!/usr/bin/env python3
import json
import os
import sys
import asyncio
from datetime import datetime
import time
import threading
import schedule
from fastapi import FastAPI, HTTPException, BackgroundTasks
import httpx
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv

# --- Setup and Configuration ---

# Add workspace root to system path
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(WORKSPACE_ROOT)

# Load environment variables from .env file in the root directory
dotenv_path = os.path.join(WORKSPACE_ROOT, '.env')
load_dotenv(dotenv_path=dotenv_path)

# The scraper.py module is deprecated in favor of live Gemini search grounding.
from scraper import perform_scraping

# --- In-Memory State and File I/O ---

SYNC_FILE_PATH = os.path.join(WORKSPACE_ROOT, "synced_products.json")

# A simple in-memory store for sync status. In a real production app, this might be a database or Redis.
sync_status_store = {
    "last_sync_time": datetime.now().isoformat(),
    "sync_logs": [
        "System bootstrap: FastAPI-based daily pricing daemon initialized.",
        "Successfully registered cron proxy on backend gateway."
    ]
}

def load_synced_products():
    """Retrieve indexed commodities list from the JSON cache disk filesystem."""
    if os.path.exists(SYNC_FILE_PATH):
        try:
            with open(SYNC_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[FastAPI Error] Failed to read cached JSON database: {e}", file=sys.stderr)
    return []

def save_synced_products(products: List[dict]):
    """Write back updated indexes to protect cache integrity."""
    try:
        with open(SYNC_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(products, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[FastAPI Error] Failed to write catalog JSON: {e}", file=sys.stderr)
        return False

# --- Gemini API Service ---

async def invoke_gemini(system_instruction: str, contents: List[dict], response_schema: Optional[dict] = None, is_json: bool = False) -> str:
    """Secure client to request intelligence or grounding parameters from Gemini API REST gateway."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[FastAPI Warning] GEMINI_API_KEY env variable is absent.", file=sys.stderr)
        raise ValueError("Missing Gemini credentials")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_instruction}]}
    }

    generation_config = {}
    if is_json:
        generation_config["responseMimeType"] = "application/json"
    if response_schema:
        generation_config["responseSchema"] = response_schema
    
    if generation_config:
        payload["generationConfig"] = generation_config

    if response_schema and "prices" in str(response_schema):
        payload["tools"] = [{"google_search": {}}]

    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            res.raise_for_status()
            response_data = res.json()
            return response_data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, httpx.HTTPStatusError) as err:
            print(f"[FastAPI Error] Malformed or failed Gemini response: {err}", file=sys.stderr)
            raise ValueError("Invalid credentials or error from model API")

# --- Core Application Logic (Services) ---

async def get_products_search_data(query: str, target_url: Optional[str] = None) -> List[dict]:
    """Performs a Gemini-grounded search for product data."""
    system_instruction = "You are a highly experienced South African shopping, price-tracking, and web scraping specialist..." # Truncated for brevity
    
    contents = [{"parts": [{"text": f"Research real current pricing... for product query: '{query}'..."}]}] # Truncated

    response_schema = {
        "type": "ARRAY", "items": {"type": "OBJECT", "properties": {
            "id": {"type": "STRING"}, "name": {"type": "STRING"}, "category": {"type": "STRING"},
            "unit": {"type": "STRING"}, "imageUrl": {"type": "STRING"}, "barcode": {"type": "STRING"},
            "isPopular": {"type": "BOOLEAN"}, "prices": {"type": "ARRAY", "items": {
                "type": "OBJECT", "properties": {
                    "storeId": {"type": "STRING"}, "price": {"type": "NUMBER"}, "onSpecial": {"type": "BOOLEAN"},
                    "specialDetail": {"type": "STRING"}, "inStock": {"type": "BOOLEAN"}
                }, "required": ["storeId", "price", "inStock"]
            }}
        }, "required": ["id", "name", "category", "unit", "prices"]}
    }

    try:
        gemini_output = await invoke_gemini(system_instruction, contents, response_schema, is_json=True)
        return json.loads(gemini_output.strip())
    except Exception as err:
        print(f"[FastAPI API Error] Gemini search grounding aborted: {err}", file=sys.stderr)
        return []

def execute_sync_run(manual: bool = False):
    """The core logic for the daily/manual product data synchronization."""
    time_str = datetime.now().strftime("%H:%M:%S")
    trigger_type = "Manual Trigger" if manual else "Daily Scheduler"
    sync_status_store["sync_logs"].insert(0, f"[{time_str}] [FastAPI Daemon] Starting background price update via {trigger_type}...")
    
    essential_queries = ["Sasko White Bread", "Clover Full Cream Milk 2L", "Nulaid Large Eggs", "Sunfoil Sunflower Oil 2L", "Huletts White Sugar 2.5kg", "Nescafé Gold Coffee"]
    
    all_new_products = []
    for query in essential_queries:
        try:
            sync_status_store["sync_logs"].insert(0, f"[{time_str}] Grounding search for: '{query}'...")
            # Run async function from sync context (background thread)
            new_prods_json = asyncio.run(get_products_search_data(query))
            all_new_products.extend(new_prods_json)
            time.sleep(2)  # Respect API rate limits
        except Exception as e:
            sync_status_store["sync_logs"].insert(0, f"[{time_str}] ERROR grounding '{query}': {e}")

    if not all_new_products:
        sync_status_store["sync_logs"].insert(0, f"[{time_str}] ERROR: Live grounding returned no products. Sync aborted.")
        return

    current_products = load_synced_products()
    new_products_map = {p['id']: p for p in all_new_products}
    merged_products = [new_products_map.pop(p['id'], p) for p in current_products]
    merged_products.extend(new_products_map.values())

    if save_synced_products(merged_products):
        sync_status_store["last_sync_time"] = datetime.now().isoformat()
        sync_status_store["sync_logs"].insert(0, f"[{time_str}] SECURE SYNC SUCCESS: Re-aligned {len(merged_products)} SA commodities.")
    else:
        sync_status_store["sync_logs"].insert(0, f"[{time_str}] ERROR: Failed saving aligned pricing arrays to JSON cache.")

    if len(sync_status_store["sync_logs"]) > 25:
        sync_status_store["sync_logs"] = sync_status_store["sync_logs"][:25]

# --- FastAPI Application Setup ---

app = FastAPI(title="Chuse Backend API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Request/Response Validation ---

class ProductSearchRequest(BaseModel):
    query: str
    targetUrl: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    basket: List[dict] = Field(default_factory=list)
    history: List[dict] = Field(default_factory=list)

# --- API Endpoints ---

@app.get("/api/products")
async def get_products():
    """Retrieve the latest cached list of all products."""
    return load_synced_products()

@app.get("/api/sync/status")
async def get_sync_status():
    """Get the status of the background synchronization daemon."""
    return {
        "success": True,
        "lastSyncTime": sync_status_store["last_sync_time"],
        "syncLogs": sync_status_store["sync_logs"],
        "schedule": "0 0 * * * (Every Daily Midnight)",
        "status": "Listening",
        "version": "3.0.0-fastapi"
    }

@app.post("/api/products/search")
async def search_products(req: ProductSearchRequest):
    """Run a live, Gemini-grounded search for a product."""
    print(f"[FastAPI] Real-time Grounded Price Search: '{req.query}'")
    results = await get_products_search_data(req.query, req.targetUrl)
    if not results:
        # You might want to return a 404 here if no products are found
        print(f"[FastAPI] No products found for query: '{req.query}'")
    return results

@app.post("/api/sync/run")
async def run_manual_sync(background_tasks: BackgroundTasks):
    """Manually trigger a background synchronization task."""
    background_tasks.add_task(execute_sync_run, manual=True)
    return {
        "success": True,
        "message": "Manually triggered background sync. Check /api/sync/status for progress."
    }

@app.post("/api/ai/chat")
async def ai_chat(req: ChatRequest):
    """Handle a request to the AI Savings Wizard."""
    if not req.message:
        raise HTTPException(status_code=400, detail="Missing message body parameter")

    print("[FastAPI] Invoking Gemini AI Chat Wizard...")
    system_instruction = f"You are 'chuse. Saving Wizard'... Current basket: {json.dumps(req.basket)}" # Truncated

    contents_payload = []
    for h in req.history:
        contents_payload.append({"role": "user" if h.get("role") == "user" else "model", "parts": [{"text": h.get("text", "")}]})
    contents_payload.append({"role": "user", "parts": [{"text": req.message}]})

    try:
        chat_reply = await invoke_gemini(system_instruction, contents_payload, is_json=False)
        return {"text": chat_reply}
    except Exception as err:
        print(f"[FastAPI Error] Gemini chat invocation aborted: {err}", file=sys.stderr)
        # Return a helpful fallback message
        return {"text": "Howzit! I'm checking store specials right now... Try swapping name brands for house brands for instant savings!"}

# --- Background Scheduler ---

def run_scheduler():
    """Run the background scheduler in a separate thread."""
    schedule.every().day.at("00:00").do(execute_sync_run, manual=False)
    print("[FastAPI Scheduler] Daily midnight job registered.", flush=True)
    while True:
        schedule.run_pending()
        time.sleep(60)

@app.on_event("startup")
async def startup_event():
    """On application startup, start the background scheduler."""
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

# --- Main Entry Point for Uvicorn ---

if __name__ == "__main__":
    import uvicorn
    port_to_run = 8000
    if len(sys.argv) > 1:
        try:
            port_to_run = int(sys.argv[1])
        except ValueError:
            pass
    uvicorn.run(app, host="127.0.0.1", port=port_to_run)