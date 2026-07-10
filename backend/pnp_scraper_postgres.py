"""
PnP scraper -> writes directly into the Cloud SQL Postgres database backing
your Firebase Data Connect schema (choose-edec8-database).

SETUP (once):
  1. pip install psycopg2-binary requests
  2. Run setup_scraper_role.sql in psql (creates `scraper_user`)
  3. Start the Cloud SQL Auth Proxy in a separate terminal:
       cloud-sql-proxy --port 5432 choose-edec8:us-east4:frontend-fdc
  4. Set the DB password as an env var (PowerShell):
       $env:CHUSE_DB_PASSWORD = "the-password-you-set-in-the-sql-file"

"""

import os
import time
from datetime import date, datetime

import requests
import psycopg2
import psycopg2.extras

# SCHEMA / COLUMN MAPPING (edit here if your live schema differs) 
TABLES = {
    "product": "product",
    "store": "store",
    "price": "price",
    "availability": "availability",
}

COLUMNS = {
    "product": {
        "pk": "product_code",
        "description": "description",
        "barcode": "barcode",
        "name": "name",
        "category": "category",
        "subcategory": "subcategory",
        "retailer": "store",      
        "image_url": "image_url",
    },
    "store": {
        "pk": "store_code",
        "name": "name",
        "city": "city",
        "province": "province",
        "postal_code": "postal_code",
        "street_address": "street_address",
    },
    "price": {
        "product_fk": "product_product_code",
        "store_fk": "store_store_code",
        "price": "price",
        "original_price": "original_price",
        "savings": "savings",
        "on_special": "on_special",
        "promotion_description": "promotion_description",
        "date_recorded": "date_recorded",
    },
    "availability": {
        "product_fk": "product_product_code",
        "store_fk": "store_store_code",
    },
}

RETAILER = "PNP"  
STORE_CODE = "WC21"

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

# DB CONNECTION (Cloud SQL Auth Proxy on localhost) 
DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 5432,
    "dbname": "choose-edec8-database",
    "user": "scraper_user",
    "password": os.environ.get("CHUSE_DB_PASSWORD"),
}


def get_db():
    if not DB_CONFIG["password"]:
        raise RuntimeError(
            "CHUSE_DB_PASSWORD env var is not set. In PowerShell:\n"
            '  $env:CHUSE_DB_PASSWORD = PASSOWORD'
        )
    return psycopg2.connect(**DB_CONFIG)


# ENSURE STORE ROW EXISTS 
def ensure_store(cursor):
    c = COLUMNS["store"]
    cursor.execute(
        f"""
        INSERT INTO {TABLES['store']} ({c['pk']}, {c['name']}, {c['city']},
            {c['province']}, {c['postal_code']}, {c['street_address']})
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT ({c['pk']}) DO NOTHING
        """,
        (STORE_CODE, f"PnP {STORE_CODE}", "Unknown", "Unknown", "0000", "Unknown"),
    )


# SAVE PRODUCTS TO DB 
def save_products(products, category_name, conn):
    cursor = conn.cursor()
    from datetime import datetime, UTC
    now = datetime.now(UTC)
    saved, skipped = 0, 0

    pc = COLUMNS["product"]
    prc = COLUMNS["price"]
    avc = COLUMNS["availability"]

    for p in products:
        code = p.get("code")
        name = p.get("name")
        category_names = p.get("categoryNames", [])
        category = category_names[1] if len(category_names) > 1 else category_name
        subcategory = category_names[2] if len(category_names) > 2 else None
        price_data = p.get("price", {}) or {}
        price = price_data.get("value")
        original_price = price_data.get("oldPrice")
        savings = price_data.get("savings", 0)
        on_special = bool(savings and savings > 0)
        image_url = None
        images = p.get("images") or []
        if images:
            image_url = images[0].get("url")

        if not code or not name or price is None:
            skipped += 1
            continue

        try:
            # Upsert product
            cursor.execute(
                f"""
                INSERT INTO {TABLES['product']}
                    ({pc['pk']}, {pc['name']}, {pc['category']}, {pc['subcategory']},
                     {pc['retailer']}, {pc['image_url']})
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT ({pc['pk']}) DO UPDATE SET
                    {pc['name']} = EXCLUDED.{pc['name']},
                    {pc['category']} = EXCLUDED.{pc['category']},
                    {pc['subcategory']} = EXCLUDED.{pc['subcategory']},
                    {pc['image_url']} = EXCLUDED.{pc['image_url']}
                """,
                (code, name, category, subcategory, RETAILER, image_url),
            )

            # Upsert current price (one row per product, per your schema's key)
            cursor.execute(
                f"""
                INSERT INTO {TABLES['price']}
                    ({prc['product_fk']}, {prc['store_fk']}, {prc['price']},
                     {prc['original_price']}, {prc['savings']}, {prc['on_special']},
                     {prc['date_recorded']})
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ({prc['product_fk']}) DO UPDATE SET
                    {prc['store_fk']} = EXCLUDED.{prc['store_fk']},
                    {prc['price']} = EXCLUDED.{prc['price']},
                    {prc['original_price']} = EXCLUDED.{prc['original_price']},
                    {prc['savings']} = EXCLUDED.{prc['savings']},
                    {prc['on_special']} = EXCLUDED.{prc['on_special']},
                    {prc['date_recorded']} = EXCLUDED.{prc['date_recorded']}
                """,
                (code, STORE_CODE, price, original_price, savings, on_special, now),
            )

            # Record availability at this store (skip if pair already exists)
            cursor.execute(
                f"""
                SELECT 1 FROM {TABLES['availability']}
                WHERE {avc['product_fk']} = %s AND {avc['store_fk']} = %s
                LIMIT 1
                """,
                (code, STORE_CODE),
            )
            if cursor.fetchone() is None:
                cursor.execute(
                    f"""
                    INSERT INTO {TABLES['availability']} ({avc['product_fk']}, {avc['store_fk']})
                    VALUES (%s, %s)
                    """,
                    (code, STORE_CODE),
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
