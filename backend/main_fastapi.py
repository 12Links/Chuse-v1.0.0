#!/usr/bin/env python3
import os
import sys
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncpg
from sqlalchemy import create_engine
from dotenv import load_dotenv

# --- Load environment variables ---
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# --- Setup and Configuration ---
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(WORKSPACE_ROOT)

from scraper import run_all_scrapers
import backend.app.services  # Initializes Firebase Admin for Auth
from backend.app.database import Base
from backend.app.models import Product, PricePoint, PriceHistory

# --- In-Memory State ---
sync_status_store = {
    "last_sync_time": datetime.now().isoformat(),
    "sync_logs": [
        "System bootstrap: FastAPI-based daily pricing daemon initialized.",
        "Successfully registered cron proxy on backend gateway."
    ]
}

# --- Background Scheduler & Lifespan ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_NAME = os.getenv("DB_NAME", "dataconnect")
    INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME", "choose-edec8:us-east4:frontend-fdc")

    if not DB_USER or not DB_PASS:
        raise RuntimeError("DB_USER and DB_PASS must be set in your backend/.env file")

    if os.getenv("K_SERVICE"):
        # Production (Cloud Run): connect via Unix socket
        host_arg = f"?host=/cloudsql/{INSTANCE_CONNECTION_NAME}"
        SYNC_DB_URL  = f"postgresql://{DB_USER}:{DB_PASS}@/{DB_NAME}{host_arg}"
        ASYNC_DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@/{DB_NAME}{host_arg}"
    else:
        # Local dev: connect via Cloud SQL Auth Proxy on localhost
        SYNC_DB_URL  = f"postgresql://{DB_USER}:{DB_PASS}@127.0.0.1:5432/{DB_NAME}"
        ASYNC_DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@127.0.0.1:5432/{DB_NAME}"

    print(f"[DB] Connecting as '{DB_USER}' to '{DB_NAME}'...")

    # Create tables via SQLAlchemy (sync)
    engine = create_engine(SYNC_DB_URL)
    Base.metadata.create_all(bind=engine)
    engine.dispose()

    # Async connection pool for FastAPI endpoints
    app.state.db_pool = await asyncpg.create_pool(ASYNC_DB_URL)

    # Daily scrape scheduler (2am)
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        lambda: run_all_scrapers(app.state.db_pool),
        "cron", hour=2, minute=0
    )
    scheduler.start()
    print("[Scheduler] Daily scrape job registered at 02:00.")

    yield

    scheduler.shutdown()
    await app.state.db_pool.close()
    print("[DB] Connection pool closed.")


# --- DB Dependency ---

async def get_db(request: Request) -> asyncpg.Connection:
    conn = await request.app.state.db_pool.acquire()
    try:
        yield conn
    finally:
        await request.app.state.db_pool.release(conn)


# --- FastAPI App ---

app = FastAPI(title="Chuse Backend API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Models ---

class ChatRequest(BaseModel):
    message: str
    basket: List[dict] = Field(default_factory=list)
    history: List[dict] = Field(default_factory=list)

class ProductSearchRequest(BaseModel):
    query: str


# --- Endpoints ---

@app.post("/scrape/trigger")
async def trigger_scrape(background_tasks: BackgroundTasks, request: Request):
    background_tasks.add_task(run_all_scrapers, request.app.state.db_pool)
    return {"status": "scrape started"}


@app.get("/prices/{product_id}")
async def get_prices(product_id: str, conn: asyncpg.Connection = Depends(get_db)):
    records = await conn.fetch(
        'SELECT * FROM price_points WHERE product_id = $1', product_id
    )
    return [dict(r) for r in records]


@app.get("/api/products")
async def get_products(conn: asyncpg.Connection = Depends(get_db)):
    try:
        products_records = await conn.fetch(
            'SELECT id, name, category, unit, barcode, "imageUrl" FROM products'
        )
        if not products_records:
            return []

        products = [dict(p) for p in products_records]
        product_ids = [p["id"] for p in products]

        prices_records = await conn.fetch(
            'SELECT product_id, store_id, price, last_updated '
            'FROM price_points WHERE product_id = ANY($1::text[])',
            product_ids
        )

        prices_map = {}
        for pr in prices_records:
            pid = pr["product_id"]
            prices_map.setdefault(pid, []).append({
                "storeId":     pr["store_id"],
                "price":       pr["price"],
                "inStock":     True,
                "lastUpdated": pr["last_updated"].isoformat() if pr["last_updated"] else None,
            })

        for product in products:
            product["prices"] = prices_map.get(product["id"], [])

        return products

    except Exception as e:
        print(f"[FastAPI Error] Failed to fetch products: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail="Failed to retrieve products from the database.")


@app.post("/api/products/search")
async def search_products(req: ProductSearchRequest, conn: asyncpg.Connection = Depends(get_db)):
    query = req.query.strip().lower()
    if not query:
        return []
    records = await conn.fetch(
        'SELECT id, name, category, unit, barcode, "imageUrl" '
        'FROM products WHERE name ILIKE $1',
        f"%{query}%"
    )
    return [dict(r) for r in records]


@app.get("/api/sync/status")
async def get_sync_status():
    return {
        "success":     True,
        "lastSyncTime": sync_status_store["last_sync_time"],
        "syncLogs":    sync_status_store["sync_logs"],
        "schedule":    "0 2 * * * (Every day at 2am)",
        "status":      "Listening",
        "version":     "4.0.0-playwright"
    }


@app.post("/api/ai/chat")
async def ai_chat(req: ChatRequest):
    if not req.message:
        raise HTTPException(status_code=400, detail="Missing message body parameter")
    return {"text": "The AI chat is currently being updated. Please try again later."}


# --- Entry Point ---

if __name__ == "__main__":
    import uvicorn
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    uvicorn.run(app, host="127.0.0.1", port=port)