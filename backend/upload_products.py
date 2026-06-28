import json
import os
import sys
import asyncio
import asyncpg
import uuid
from dotenv import load_dotenv

# Add project root to path to allow importing backend services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env from the project root
project_root = os.path.dirname(sys.path[-1])
load_dotenv(dotenv_path=os.path.join(project_root, '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

async def upload_products():
    """
    One-time script to upload product base data from synced_products.json
    to the 'products' table in the SQL database.
    """
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable must be set.")

    # Note: Data Connect manages the schema, so we don't create tables here.
    # We will also upload Store data for the scraper to use.
    stores_to_upload = [
        {"name": "Checkers"}, {"name": "Pick n Pay"}, {"name": "Woolworths"},
        {"name": "Spar"}, {"name": "Shoprite"}, {"name": "Boxer"}
    ]

    project_root = os.path.dirname(sys.path[-1])
    json_path = os.path.join(project_root, 'synced_products.json')
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        products_data = json.load(f)

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print("Uploading store data...")
        for store in stores_to_upload:
            # Use a deterministic UUID based on the store name
            store_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, store["name"])
            await conn.execute('''
                INSERT INTO "Store" ("id", "name") VALUES ($1, $2)
                ON CONFLICT ("id") DO NOTHING
            ''', store_uuid, store["name"])
        print(f"Upserted {len(stores_to_upload)} stores.")

        print(f"Found {len(products_data)} products in JSON file. Starting upload...")
        count = 0
        for product_data in products_data:
            product_id_str = product_data.get("id")
            if not product_id_str:
                continue

            # Your schema requires a UUID, but your JSON has string IDs like "prod-bread".
            # We'll generate a deterministic UUID from the string ID to keep it consistent.
            product_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, product_id_str)

            result = await conn.execute(
                '''
                INSERT INTO "Product" ("id", "name", "category", "unit", "barcode", "imageUrl")
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT ("id") DO NOTHING
                ''',
                product_uuid,
                product_data.get("name"),
                product_data.get("category"),
                product_data.get("unit"),
                product_data.get("barcode"),
                product_data.get("imageUrl")
            )
            if result.endswith('1'): # Check if a row was inserted
                count += 1
        print(f"Successfully inserted {count} new products into the 'Product' table.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(upload_products())