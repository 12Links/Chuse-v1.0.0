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
from backend.app.database import Base, get_db as get_sqlalchemy_db
from backend.app.models import Product, PricePoint, PriceHistory
from backend.app.routers import api_v1

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
        ASYNC_DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@/{DB_NAME}{host_arg}"
    else:
        # Local dev: connect via Cloud SQL Auth Proxy on localhost
        ASYNC_DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@127.0.0.1:5432/{DB_NAME}"

    print(f"[DB] Connecting as '{DB_USER}' to '{DB_NAME}'...")

    # Create tables via SQLAlchemy (using engine from database.py)
    from backend.app.database import engine
    Base.metadata.create_all(bind=engine)

    # Async connection pool for FastAPI endpoints
    app.state.db_pool = await asyncpg.create_pool(ASYNC_DB_URL)
    await _ensure_trigram_support(app.state.db_pool)

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

# Include routers
app.include_router(api_v1.router)


# --- Pydantic Models ---

class ChatRequest(BaseModel):
    message: str
    basket: List[dict] = Field(default_factory=list)
    history: List[dict] = Field(default_factory=list)

class ProductSearchRequest(BaseModel):
    query: str


SEARCH_AUTOCOMPLETE_LIMIT = 10
SEARCH_DEFAULT_LIMIT = 12
SEARCH_MAX_LIMIT = 50


async def _ensure_trigram_support(pool):
    try:
        async with pool.acquire() as conn:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_products_name_trgm "
                "ON products USING gin (lower(name) gin_trgm_ops)"
            )
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_products_category_trgm "
                "ON products USING gin (lower(category) gin_trgm_ops)"
            )
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_price_points_product_store "
                "ON price_points (product_id, store_id)"
            )
    except Exception as exc:
        print(f"[DB] Trigram bootstrap skipped: {exc}", file=sys.stderr)


async def _attach_prices(conn: asyncpg.Connection, products: list[dict]) -> list[dict]:
    if not products:
        return []

    product_ids = [product["id"] for product in products]
    price_records = await conn.fetch(
        "SELECT product_id, store_id, price, last_updated "
        "FROM price_points WHERE product_id = ANY($1::text[])",
        product_ids,
    )

    prices_map: dict[str, list[dict]] = {}
    for price_record in price_records:
        product_id = price_record["product_id"]
        prices_map.setdefault(product_id, []).append({
            "storeId": price_record["store_id"],
            "price": price_record["price"],
            "inStock": True,
            "lastUpdated": price_record["last_updated"].isoformat() if price_record["last_updated"] else None,
        })

    for product in products:
        product["prices"] = prices_map.get(product["id"], [])

    return products


async def _fetch_products_page(
    conn: asyncpg.Connection,
    query: str,
    limit: int,
    offset: int,
    include_prices: bool = True,
    autocomplete_only: bool = False,
):
    normalized_query = query.strip().lower()
    if not normalized_query:
        return [] if autocomplete_only else {"items": [], "has_more": False, "limit": limit, "offset": offset}

    search_like = f"%{normalized_query}%"
    prefix_like = f"{normalized_query}%"
    query_like = prefix_like if len(normalized_query) < 3 else search_like
    fetch_limit = max(1, limit) + 1

    if autocomplete_only:
        records = await conn.fetch(
            """
            WITH ranked AS (
                SELECT name,
                       GREATEST(
                           similarity(lower(name), $1),
                           similarity(lower(COALESCE(category, '')), $1)
                       ) AS score
                FROM products
                WHERE lower(name) LIKE $2
                   OR lower(COALESCE(category, '')) LIKE $2
                   OR lower(name) % $1
                   OR lower(COALESCE(category, '')) % $1
            )
            SELECT name
            FROM ranked
            GROUP BY name
            ORDER BY MAX(score) DESC, MIN(name) ASC
            LIMIT $3
            """,
            normalized_query,
            query_like,
            limit,
        )
        return [record["name"] for record in records]

    records = await conn.fetch(
        """
        WITH ranked AS (
            SELECT id, name, category, unit, barcode, "imageUrl", isPopular,
                   GREATEST(
                       similarity(lower(name), $1),
                       similarity(lower(COALESCE(category, '')), $1)
                   ) AS score
            FROM products
            WHERE lower(name) LIKE $2
               OR lower(COALESCE(category, '')) LIKE $2
               OR lower(name) % $1
               OR lower(COALESCE(category, '')) % $1
            ORDER BY score DESC, name ASC
            LIMIT $3 OFFSET $4
        )
        SELECT * FROM ranked
        """,
        normalized_query,
        query_like,
        fetch_limit,
        offset,
    )

    has_more = len(records) > limit
    products = [dict(record) for record in records[:limit]]

    if include_prices:
        products = await _attach_prices(conn, products)

    return {
        "items": products,
        "has_more": has_more,
        "limit": limit,
        "offset": offset,
    }


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
    result = await _fetch_products_page(
        conn,
        req.query,
        max(1, min(req.limit, SEARCH_MAX_LIMIT)),
        max(0, req.offset),
        include_prices=True,
        autocomplete_only=False,
    )
    return result["items"]


@app.get("/autocomplete")
@app.get("/api/autocomplete")
async def autocomplete(q: str = "", limit: int = SEARCH_AUTOCOMPLETE_LIMIT, conn: asyncpg.Connection = Depends(get_db)):
    return await _fetch_products_page(
        conn,
        q,
        max(1, min(limit, SEARCH_AUTOCOMPLETE_LIMIT)),
        0,
        include_prices=False,
        autocomplete_only=True,
    )


@app.get("/search")
@app.get("/api/search")
async def search(
    q: str = "",
    limit: int = SEARCH_DEFAULT_LIMIT,
    offset: int = 0,
    conn: asyncpg.Connection = Depends(get_db),
):
    return await _fetch_products_page(
        conn,
        q,
        max(1, min(limit, SEARCH_MAX_LIMIT)),
        max(0, offset),
        include_prices=True,
        autocomplete_only=False,
    )


@app.get("/products/{product_id}")
async def get_product_detail(product_id: str, conn: asyncpg.Connection = Depends(get_db)):
    product_record = await conn.fetchrow(
        'SELECT id, name, category, unit, barcode, "imageUrl", isPopular '
        'FROM products WHERE id = $1',
        product_id,
    )
    if not product_record:
        raise HTTPException(status_code=404, detail="Product not found")

    product = dict(product_record)
    priced_products = await _attach_prices(conn, [product])
    product["prices"] = priced_products[0]["prices"] if priced_products else []
    return product


@app.get("/products/{product_id}/compare-stores")
async def compare_stores(product_id: str, conn: asyncpg.Connection = Depends(get_db)):
    product_record = await conn.fetchrow(
        'SELECT id, name, barcode FROM products WHERE id = $1',
        product_id,
    )
    if not product_record:
        raise HTTPException(status_code=404, detail="Product not found")

    store_rows = await conn.fetch(
        'SELECT s.id AS store_id, s.name AS store_name, p.price, p.last_updated '
        'FROM price_points p '
        'JOIN stores s ON s.id = p.store_id '
        'WHERE p.product_id = $1 '
        'ORDER BY p.price ASC NULLS LAST, s.name ASC',
        product_id,
    )

    return {
        "productId": product_id,
        "barcode": product_record["barcode"],
        "stores": [
            {
                "storeId": row["store_id"],
                "storeName": row["store_name"],
                "price": row["price"],
                "lastUpdated": row["last_updated"].isoformat() if row["last_updated"] else None,
            }
            for row in store_rows
        ],
    }


@app.get("/products/{product_id}/compare-brands")
async def compare_brands(
    product_id: str,
    store: str = "",
    limit: int = SEARCH_DEFAULT_LIMIT,
    conn: asyncpg.Connection = Depends(get_db),
):
    product_record = await conn.fetchrow(
        'SELECT id, name, category, unit FROM products WHERE id = $1',
        product_id,
    )
    if not product_record:
        raise HTTPException(status_code=404, detail="Product not found")

    if not store:
        raise HTTPException(status_code=400, detail="store is required")

    store_record = await conn.fetchrow(
        'SELECT id, name FROM stores WHERE id = $1 OR lower(name) = lower($1)',
        store,
    )
    if not store_record:
        raise HTTPException(status_code=404, detail="Store not found")

    substitute_rows = await conn.fetch(
        'SELECT p.id, p.name, p.category, p.unit, p.barcode, p."imageUrl", pp.price, s.name AS store_name '
        'FROM products p '
        'JOIN price_points pp ON pp.product_id = p.id '
        'JOIN stores s ON s.id = pp.store_id '
        'WHERE pp.store_id = $1 '
        '  AND p.category = $2 '
        '  AND p.unit = $3 '
        '  AND p.id <> $4 '
        'ORDER BY pp.price ASC NULLS LAST, p.name ASC '
        'LIMIT $5',
        store_record["id"],
        product_record["category"],
        product_record["unit"],
        product_id,
        max(1, min(limit, SEARCH_MAX_LIMIT)),
    )

    return {
        "productId": product_id,
        "storeId": store_record["id"],
        "storeName": store_record["name"],
        "items": [dict(row) for row in substitute_rows],
    }


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