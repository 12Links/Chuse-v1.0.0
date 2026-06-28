import asyncio
import os
import sys
from playwright.async_api import async_playwright
from datetime import datetime
import asyncpg
from dotenv import load_dotenv

# Load environment variables from .env in the project root
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


# Build absolute paths from the script's location
SCRAPER_DIR = os.path.dirname(os.path.abspath(__file__))

async def scrape_checkers(barcode: str) -> float | None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(
                f"https://www.checkers.co.za/search?q={barcode}",
                wait_until="networkidle",
                timeout=30000
            )
            # Adjust selector to match Checkers actual DOM
            price_el = await page.query_selector("[class*='price']")
            if price_el:
                raw = await price_el.inner_text()
                return float(raw.replace("R", "").replace(",", "").strip())
        except Exception as e:
            print(f"Checkers scrape failed: {e}")
        finally:
            await browser.close()
    return None

async def save_price(pool: asyncpg.Pool, product_id: str, store_name: str, price: float):
    now = datetime.utcnow()
    async with pool.acquire() as conn:
        try:
            # Get store UUID from store name
            store_record = await conn.fetchrow('SELECT "id" FROM "Store" WHERE "name" = $1', store_name)
            if not store_record:
                print(f"Warning: Store '{store_name}' not found in database. Skipping price save.", file=sys.stderr)
                return
            store_uuid = store_record['id']

            # Get old price to check for history logging
            old_price_record = await conn.fetchrow(
                'SELECT "price" FROM "PricePoint" WHERE "productId" = $1 AND "storeId" = $2',
                product_id, store_uuid
            )
            old_price = old_price_record['price'] if old_price_record else None

            # Use INSERT...ON CONFLICT to perform an "upsert"
            # This requires a unique constraint on ("productId", "storeId") in your PricePoint table
            await conn.execute('''
                INSERT INTO "PricePoint" ("productId", "storeId", "price", "lastUpdated")
                VALUES ($1, $2, $3, $4)
                ON CONFLICT ("productId", "storeId") DO UPDATE
                SET "price" = EXCLUDED.price,
                    "lastUpdated" = EXCLUDED.lastUpdated
            ''', product_id, store_uuid, price, now)

            # Only write to PriceHistory if the price has changed
            if old_price is not None and old_price != price:
                await conn.execute('''
                    INSERT INTO "PriceHistory" ("productId", "storeId", "price", "recordedAt")
                    VALUES ($1, $2, $3, $4)
                ''', product_id, store_uuid, price, now)
                print(f"Price changed for {product_id} at {store_name}: {old_price} → {price}")

        except Exception as e:
            print(f"Error in save_price: {e}", file=sys.stderr)

async def run_all_scrapers(pool: asyncpg.Pool = None):
    """Fetches all products from the SQL database and scrapes their latest prices."""
    print("Starting scraper run...")

    # If no pool is passed, create one for standalone execution.
    should_close_pool = False
    if pool is None:
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable is not set for the scraper")
        pool = await asyncpg.create_pool(DATABASE_URL)
        should_close_pool = True

    try:
        products_to_scrape = await pool.fetch('SELECT "id", "barcode" FROM "Product" WHERE "barcode" IS NOT NULL')

        for product in products_to_scrape:
            barcode = product['barcode']
            product_id = product['id']

            if not barcode or not product_id:
                continue

            # Run scrapers in parallel
            results = await asyncio.gather(
                scrape_checkers(barcode),
                # scrape_pnp(barcode),
                # scrape_woolworths(barcode),
                return_exceptions=True
            )

            store_map = {
                0: "Checkers",
                # 1: "Pick n Pay",
                # 2: "Woolworths",
            }

            for i, price in enumerate(results):
                if isinstance(price, float):
                    store_name = store_map.get(i)
                    if store_name:
                        await save_price(pool, product_id, store_name, price)
        print("Scraper run finished.")
    finally:
        if should_close_pool and pool:
            await pool.close()

if __name__ == "__main__":
    asyncio.run(run_all_scrapers())
