"""
PnP scraper -> writes directly into the Cloud SQL Postgres database backing
your Firebase Data Connect schema (choose-edec8-database).

SETUP (once):
  1. pip install psycopg2-binary requests
  2. Run setup_scraper_role.sql in psql (creates `scraper_user`)
  3. Start the Cloud SQL Auth Proxy in a separate terminal:
       cloud-sql-proxy --port 5432 choose-edec8:us-east4:frontend-fdc
  4. Set the DB password as an env var (PowerShell):
       $env:CHUSE_DB_PASSWORD = "the-password-you-set-in-the-sql-file" or use export CHUSE_DB_PASSWORD="the password" for Linux/MacOS
       PLEASE NOTE: The password is stored in the .env file for local development, but you should not commit it to version control.
       AND GENTS READ THE README.md FOR MORE INFO ON HOW TO SETUP THE DATABASE AND RUN THE SCRAPER.

"""

import os
import time
from datetime import date, datetime

import requests
import psycopg2
import psycopg2.extras

# SCHEMA / COLUMN MAPPING (Aligned with Supabase public schema)
TABLES = {
    "product": "products",
    "store": "stores",
    "price": "prices",
}

COLUMNS = {
    "product": {
        "pk": "id",
        "name": "name",
        "category": "category",
        "image_url": "image_url",
    },
    "store": {
        "pk": "id",
        "name": "name",
    },
    "price": {
        "product_fk": "product_id",
        "store_fk": "store_id",
        "price": "price",
        "on_special": "on_special",
        "special_detail": "special_detail",
        "last_updated": "last_updated",
    },
}

RETAILER = "Pick n Pay"  
STORE_CODE = "pnp"

# PnP CATEGORY / REQUEST CONFIG
GROCERY_CATEGORIES = {
    "Milk, Dairy & Eggs": "milk-dairy-and-eggs-423144840",
    "Food Cupboard": "food-cupboard-423144840",
    "Chocolates, Chips & Snacks": "chocolates-chips-and-snacks-423144840",
    "Fresh Fruit & Vegetables": "fresh-fruit-and-vegetables-423144840",
    "Meat, Poultry & Seafood": "meat-poultry-and-seafood-423144840",
    "Bakery": "bakery-423144840",
    "Frozen Food": "frozen-food-423144840",
    "Beverages": "beverages-423144840",
    "Baby": "baby-423144840",
    "Deli & Party": "deli-and-party-423144840",
    "Household & Cleaning": "household-and-cleaning-423144840",
    "Pet Care": "pet-care-423144840",
    "Ready Meals & Desserts": "ready-meals-and-desserts-423144840",
}

HEADERS = {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "origin": "https://www.pnp.co.za",
    "referer": "https://www.pnp.co.za/c/pnpbase",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    "x-anonymous-consents": "%5B%5D",
    "x-pnp-cache-key": "anonymous",
    "x-pnp-search-client-id": "1eb7239c-d31c-430f-ac41-bcadf24d5ba5",
    "x-pnp-search-session-id": "6",
    "cookie": "route=8e934bb743952bd655dc1613e83e1b92",
}

REQUEST_TIMEOUT = 15
SLEEP_BETWEEN_PAGES = 0.5
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2

# DB CONNECTION (Supports direct Supabase PostgreSQL connection or host/port config)
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "127.0.0.1"),
    "port": int(os.environ.get("DB_PORT", 5432)),
    "dbname": os.environ.get("DB_NAME", "postgres"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("CHUSE_DB_PASSWORD") or os.environ.get("DB_PASS"),
}


def get_db():
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    if not DB_CONFIG["password"]:
        raise RuntimeError(
            "DATABASE_URL or CHUSE_DB_PASSWORD env var is not set."
        )
    return psycopg2.connect(**DB_CONFIG)


# ENSURE STORE ROW EXISTS 
def ensure_store(cursor):
    cursor.execute(
        """
        INSERT INTO stores (id, name, premium_multiplier, loyalty_program)
        VALUES ('pnp', 'Pick n Pay', 1.02, 'Smart Shopper')
        ON CONFLICT (id) DO NOTHING
        """
    )


# SAVE PRODUCTS TO DB 
def save_products(products, category_name, conn):
    cursor = conn.cursor()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    saved, skipped = 0, 0

    for p in products:
        code = str(p.get("code") or "")
        name = p.get("name")
        category_names = p.get("categoryNames", [])
        category = category_names[1] if len(category_names) > 1 else category_name
        price_data = p.get("price", {}) or {}
        price = price_data.get("value")
        savings = price_data.get("savings", 0)
        on_special = bool(savings and savings > 0)
        special_detail = f"Save R{savings:.2f}" if on_special else ""
        image_url = None
        images = p.get("images") or []
        if images:
            image_url = images[0].get("url")

        if not code or not name or price is None:
            skipped += 1
            continue

        prod_id = f"pnp-{code}"

        try:
            # Upsert product
            cursor.execute(
                """
                INSERT INTO products (id, name, category, image_url)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    image_url = EXCLUDED.image_url
                """,
                (prod_id, name, category, image_url),
            )

            # Upsert price
            cursor.execute(
                """
                INSERT INTO prices (product_id, store_id, price, on_special, special_detail, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (product_id, store_id) DO UPDATE SET
                    price = EXCLUDED.price,
                    on_special = EXCLUDED.on_special,
                    special_detail = EXCLUDED.special_detail,
                    last_updated = EXCLUDED.last_updated
                """,
                (prod_id, "pnp", price, on_special, special_detail, now),
            )

            saved += 1

        except psycopg2.Error as e:
            print(f"  DB error for {code}: {e}")
            conn.rollback()
            skipped += 1
            continue

    conn.commit()
    cursor.close()
    return saved, skipped


# SCRAPE ONE CATEGORY 
def scrape_category(category_name, category_code):
    url = "https://www.pnp.co.za/pnphybris/v2/pnp-spa/products/search"
    all_products = []
    page = 0

    while True:
        params = {
            "fields": "products(code,name,summary,price(FULL),potentialPromotions(FULL),"
                      "categoryNames,averageWeight,images(FULL))",
            "query": f":relevance:allCategories:{category_code}",
            "pageSize": 72,
            "currentPage": page,
            "storeCode": STORE_CODE,
            "lang": "en",
            "curr": "ZAR",
        }

        data = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = requests.post(
                    url, params=params, headers=HEADERS, json={}, timeout=REQUEST_TIMEOUT
                )
                if response.status_code == 200:
                    data = response.json()
                    break
                elif response.status_code == 429:
                    wait = RETRY_BACKOFF_BASE ** attempt
                    print(f"  Rate limited (429). Waiting {wait}s (retry {attempt}/{MAX_RETRIES})...")
                    time.sleep(wait)
                elif response.status_code in (401, 403):
                    print(f"  Auth/blocked error {response.status_code} — session headers may be stale.")
                    break
                else:
                    print(f"  Error {response.status_code}, retry {attempt}/{MAX_RETRIES}")
                    time.sleep(RETRY_BACKOFF_BASE ** attempt)
            except requests.exceptions.RequestException as e:
                print(f"  Request error (attempt {attempt}/{MAX_RETRIES}): {e}")
                time.sleep(RETRY_BACKOFF_BASE ** attempt)

        if data is None:
            print(f"  Giving up on page {page + 1} for '{category_name}' after {MAX_RETRIES} attempts.")
            break

        products = data.get("products", [])
        pagination = data.get("pagination", {})
        total_pages = pagination.get("totalPages", 1)
        total_results = pagination.get("totalResults", 0)

        print(f"  Page {page + 1}/{total_pages} — {len(products)} products (total: {total_results})")
        all_products.extend(products)

        if page >= total_pages - 1:
            break

        page += 1
        time.sleep(SLEEP_BETWEEN_PAGES)

    return all_products


# MAIN LOOP 
def main():
    print("Starting PnP scrape -> Postgres...\n")
    grand_total = 0
    conn = get_db()

    try:
        with conn.cursor() as cur:
            ensure_store(cur)
        conn.commit()

        for category_name, category_code in GROCERY_CATEGORIES.items():
            print(f"\nCategory: {category_name}")
            try:
                products = scrape_category(category_name, category_code)
                saved, skipped = save_products(products, category_name, conn)
                grand_total += saved
                print(f"  Saved: {saved} | Skipped: {skipped}")
            except Exception as e:
                print(f"  Category '{category_name}' failed: {e}")
                conn.rollback()
    finally:
        conn.close()

    print(f"\nDone. Total products saved: {grand_total}")


if __name__ == "__main__":
    main()
