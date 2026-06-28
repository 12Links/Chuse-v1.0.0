#!/usr/bin/env python3
import os
import sys
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncpg

# --- Setup and Configuration ---

# Add workspace root to system path
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(WORKSPACE_ROOT)

from scraper import run_all_scrapers
import backend.app.services  # This initializes Firebase Admin for Auth


# --- In-Memory State and File I/O ---

# A simple in-memory store for sync status. In a real production app, this might be a database or Redis.
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
    """On application startup, start the background scheduler."""
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set for the application")

    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)

    scheduler = AsyncIOScheduler()
    # Pass the pool to the scheduled job
    scheduler.add_job(lambda: run_all_scrapers(app.state.db_pool), "cron", hour=2, minute=0)  # 2am daily
    scheduler.start()

    yield

    await app.state.db_pool.close()

async def get_db(request: Request) -> asyncpg.Connection:
    """
    FastAPI dependency that provides a DB connection from the pool and
    releases it automatically.
    """
    conn = await request.app.state.db_pool.acquire()
    try:
        yield conn
    finally:
        await request.app.state.db_pool.release(conn)

# --- FastAPI Application Setup ---

app = FastAPI(title="Chuse Backend API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Request/Response Validation ---

class ChatRequest(BaseModel):
    message: str
    basket: List[dict] = Field(default_factory=list)
    history: List[dict] = Field(default_factory=list)

class ProductSearchRequest(BaseModel):
    query: str

# --- API Endpoints ---

@app.post("/scrape/trigger")
async def trigger_scrape(background_tasks: BackgroundTasks):
    # Pass the pool to the background task
    background_tasks.add_task(run_all_scrapers, background_tasks.app.state.db_pool)
    return {"status": "scrape started"}

@app.get("/prices/{product_id}")
async def get_prices(product_id: str, conn: asyncpg.Connection = Depends(get_db)):
    # Return all store prices for a product
    price_points_records = await conn.fetch('SELECT * FROM "PricePoint" WHERE "productId" = $1', product_id)
    # The connection is released automatically by the `get_db` dependency
    return [dict(p) for p in price_points_records]

@app.get("/api/products")
async def get_products(conn: asyncpg.Connection = Depends(get_db)):
    """Retrieve the list of all products from the SQL DB, enriched with live prices."""
    try:
        # 1. Get all products from the 'Product' table
        products_records = await conn.fetch('SELECT "id", "name", "category", "unit", "barcode", "imageUrl" FROM "Product"')

        products = []
        product_ids = []
        for p in products_records:
            products.append(dict(p))
            product_ids.append(p['id'])

        if not products:
            return []

        # 2. Get all relevant prices from 'PricePoint' in one query
        prices_records = await conn.fetch('SELECT "productId", "storeId", "price", "lastUpdated" FROM "PricePoint" WHERE "productId" = ANY($1::uuid[])', product_ids)

        prices_map = {}
        for pr in prices_records:
            pid = pr['productId']
            if pid not in prices_map:
                prices_map[pid] = []

            prices_map[pid].append({
                "storeId": pr['storeId'],
                "price": pr['price'],
                "inStock": True, # Assuming price point means in stock
                "lastUpdated": pr['lastUpdated'].isoformat() if pr['lastUpdated'] else None
            })

        # 3. Combine products with their prices
        for product in products:
            product["prices"] = prices_map.get(product['id'], [])

        return products
    except Exception as e:
        print(f"[FastAPI Error] Failed to fetch products from SQL database: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail="Failed to retrieve products from the database.")

@app.post("/api/products/search")
async def search_products(req: ProductSearchRequest, conn: asyncpg.Connection = Depends(get_db)):
    """Searches for products in the SQL database based on a query string."""
    query = req.query.strip().lower()
    if not query:
        return []

    # Use a LIKE query for efficient database-side searching.
    matched_products_records = await conn.fetch(
        'SELECT "id", "name", "category", "unit", "barcode", "imageUrl" FROM "Product" WHERE "name" ILIKE $1',
        f'%{query}%'
    )
    # NOTE: This search implementation doesn't return prices to keep it fast.
    return [dict(p) for p in matched_products_records]

@app.get("/api/sync/status")
async def get_sync_status():
    """Get the status of the background synchronization daemon."""
    return {
        "success": True,
        "lastSyncTime": sync_status_store["last_sync_time"],
        "syncLogs": sync_status_store["sync_logs"],
        "schedule": "0 2 * * * (Every day at 2am)",
        "status": "Listening",
        "version": "4.0.0-playwright"
    }

@app.post("/api/ai/chat")
async def ai_chat(req: ChatRequest):
    """Handle a request to the AI Savings Wizard."""
    if not req.message:
        raise HTTPException(status_code=400, detail="Missing message body parameter")

    # This part needs to be refactored to not use invoke_gemini
    # For now, returning a placeholder
    return {"text": "The AI chat is currently being updated. Please try again later."}


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
