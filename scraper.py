#!/usr/bin/env python3
"""
CHUSE.CO.ZA - SOUTH AFRICAN GROCERY PRICING SCRAPER & SUPABASE SYNC
"""
import os
import sys
import json
import random
import argparse
import urllib.request
import urllib.parse
from datetime import datetime, timezone

# South African Supermarket Constants
STORES = {
    "woolworths": {"name": "Woolworths", "premium_multiplier": 1.15, "loyalty": "W-Rewards"},
    "checkers": {"name": "Checkers", "premium_multiplier": 1.00, "loyalty": "Xtra Savings"},
    "pnp": {"name": "Pick n Pay", "premium_multiplier": 1.02, "loyalty": "Smart Shopper"},
    "shoprite": {"name": "Shoprite", "premium_multiplier": 0.94, "loyalty": "Xtra Savings"},
    "spar": {"name": "SPAR", "premium_multiplier": 1.01, "loyalty": "SPAR Rewards"},
    "foodlovers": {"name": "Food Lover's Market", "premium_multiplier": 0.96, "loyalty": "None"},
    "boxer": {"name": "Boxer Superstores", "premium_multiplier": 0.92, "loyalty": "None"}
}

STAPLE_ITEMS = [
    {
        "id": "prod-coffee-jacobs",
        "name": "Jacobs Kronung Instant Coffee",
        "category": "Beverages",
        "unit": "200g",
        "isPopular": True,
        "barcode": "4005111122334",
        "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80",
        "base_price": 149.99
    },
    {
        "id": "prod-milk-clover",
        "name": "Clover Full Cream Fresh Milk",
        "category": "Dairy",
        "unit": "2L",
        "isPopular": True,
        "barcode": "6001234000025",
        "imageUrl": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
        "base_price": 38.99
    },
    {
        "id": "prod-bread-sasko",
        "name": "Sasko Premium White Bread",
        "category": "Bakery",
        "unit": "700g",
        "isPopular": True,
        "barcode": "6001234000018",
        "imageUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
        "base_price": 18.50
    },
    {
        "id": "prod-sugar-selati",
        "name": "Selati Pure White Sugar",
        "category": "Groceries",
        "unit": "2.5kg",
        "isPopular": True,
        "barcode": "6002135468700",
        "imageUrl": "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=400&auto=format&fit=crop&q=80",
        "base_price": 62.99
    },
    {
        "id": "prod-oil-sunfoil",
        "name": "Sunfoil Pure Sunflower Oil",
        "category": "Groceries",
        "unit": "2L",
        "isPopular": True,
        "barcode": "6003214568902",
        "imageUrl": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
        "base_price": 79.99
    },
    {
        "id": "prod-maize-iwisa",
        "name": "Iwisa Super Maize Meal",
        "category": "Staples",
        "unit": "10kg",
        "isPopular": True,
        "barcode": "6001056123456",
        "imageUrl": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80",
        "base_price": 129.99
    },
    {
        "id": "prod-rice-tastic",
        "name": "Tastic Parboiled Long Grain Rice",
        "category": "Staples",
        "unit": "2kg",
        "isPopular": True,
        "barcode": "6001016112233",
        "imageUrl": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
        "base_price": 44.99
    },
    {
        "id": "prod-eggs-nulaid",
        "name": "Nulaid Large Eggs 18pk",
        "category": "Dairy",
        "unit": "18 pack",
        "isPopular": True,
        "barcode": "6001234000056",
        "imageUrl": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&auto=format&fit=crop&q=80",
        "base_price": 54.99
    },
    {
        "id": "prod-cereal-weetbix",
        "name": "Bokomo Weet-Bix Wholegrain Wheat Biscuits",
        "category": "Breakfast",
        "unit": "450g",
        "isPopular": True,
        "barcode": "6001007001234",
        "imageUrl": "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400&auto=format&fit=crop&q=80",
        "base_price": 32.99
    },
    {
        "id": "prod-cereal-cornflakes",
        "name": "Kellogg's Toasted Corn Flakes",
        "category": "Breakfast",
        "unit": "1kg",
        "isPopular": True,
        "barcode": "6001007005678",
        "imageUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
        "base_price": 64.99
    },
    {
        "id": "prod-canned-beans",
        "name": "Koo Baked Beans in Tomato Sauce",
        "category": "Canned Goods",
        "unit": "410g",
        "isPopular": True,
        "barcode": "6001007009876",
        "imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
        "base_price": 16.99
    },
    {
        "id": "prod-sauce-allgold",
        "name": "All Gold Tomato Sauce",
        "category": "Condiments",
        "unit": "700ml",
        "isPopular": True,
        "barcode": "6001007004321",
        "imageUrl": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80",
        "base_price": 39.99
    },
    {
        "id": "prod-tea-fiveroses",
        "name": "Five Roses Ceylon Blend Tea Bags",
        "category": "Beverages",
        "unit": "100s",
        "isPopular": True,
        "barcode": "6001007008765",
        "imageUrl": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80",
        "base_price": 52.99
    },
    {
        "id": "prod-detergent-omo",
        "name": "Omo Auto Washing Powder",
        "category": "Household",
        "unit": "2kg",
        "isPopular": True,
        "barcode": "6001007002468",
        "imageUrl": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&auto=format&fit=crop&q=80",
        "base_price": 89.99
    },
    {
        "id": "prod-dishwash-sunlight",
        "name": "Sunlight Regular Dishwashing Liquid",
        "category": "Household",
        "unit": "750ml",
        "isPopular": True,
        "barcode": "6001007001357",
        "imageUrl": "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80",
        "base_price": 31.99
    }
]

def print_banner():
    print("=" * 65)
    print("       CHUSE.CO.ZA - SOUTH AFRICAN GROCERY PRICING SCRAPER      ")
    print("=" * 65)

def load_env():
    """Parse key=value from .env without requiring external dotenv package"""
    env_vars = {}
    env_path = os.path.join(os.getcwd(), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip().strip("'\"")
    return env_vars

def fetch_open_food_facts_products(query_term, limit=3):
    """
    Fetches real products from Open Food Facts API for South Africa
    """
    url = f"https://world.openfoodfacts.org/api/v3/search?countries_tags_en=South%20Africa&search_terms={urllib.parse.quote(query_term)}&page_size={limit}"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'ChuseSA/1.0.0 (https://chuse.co.za)'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('products', [])
    except Exception as e:
        print(f"  [OFF API] Request skipped or timed out for '{query_term}': {e}")
        return []

def generate_prices(base_price):
    """
    Generates realistic, competitive pricing indexes across South African stores
    """
    prices = []
    for store_id, config in STORES.items():
        # Add slight variance per store (+/- 4%) and apply store multiplier
        variance = random.uniform(0.96, 1.04)
        store_base = base_price * config["premium_multiplier"] * variance
        price_val = round(store_base, 2)
        
        # Randomly apply weekly specials (20% chance)
        on_special = random.random() < 0.20
        special_detail = ""
        
        if on_special:
            discount = random.uniform(0.08, 0.18)
            promo_price = round(price_val * (1 - discount), 2)
            promo_types = [
                f"Save R{round(price_val - promo_price, 1):.2f} with {config['loyalty']}",
                f"Buy 2 for R{round(promo_price * 2, 1):.2f}",
                f"Special Promo Price"
            ]
            special_detail = random.choice(promo_types) if config["loyalty"] != "None" else "Weekly Special Price"
            price_val = promo_price
            
        prices.append({
            "storeId": store_id,
            "price": price_val,
            "onSpecial": on_special,
            "specialDetail": special_detail,
            "inStock": random.random() < 0.96
        })
    return prices

def push_to_supabase(products):
    """
    Upserts product identity metadata only. Open Food Facts does not provide retail prices.
    """
    env_vars = load_env()
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL") or env_vars.get("SUPABASE_URL") or env_vars.get("VITE_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY") or env_vars.get("SUPABASE_SERVICE_ROLE_KEY") or env_vars.get("VITE_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key or "placeholder" in supabase_url:
        print("[*] Supabase credentials not found. Skipping live database push.")
        return

    print(f"\n[*] Syncing {len(products)} product records only to Supabase ({supabase_url})...")
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    # 1. Upsert Products
    prod_payload = []
    
    for p in products:
        prod_payload.append({
            "id": p["id"],
            "name": p["name"],
            "category": p.get("category", "Groceries"),
            "unit": p.get("unit", "1 Unit"),
            "barcode": p.get("barcode"),
            "image_url": p.get("imageUrl"),
            "is_popular": bool(p.get("isPopular", False)),
        })

    try:
        url_prods = f"{supabase_url.rstrip('/')}/rest/v1/products?on_conflict=id"
        req = urllib.request.Request(url_prods, data=json.dumps(prod_payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=20) as res:
            print(f"  ✓ Successfully synced {len(prod_payload)} products to Supabase.")

    except Exception as e:
        print(f"  [!] Supabase sync notification: {e}")

def scrape_and_update(run_live=False, sync_supabase=False):
    output_path = os.path.join(os.getcwd(), "synced_products.json")
    
    existing_products = []
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing_products = json.load(f)
                print(f"[*] Loaded {len(existing_products)} existing items from synced_products.json")
        except Exception as e:
            print(f"[!] Error reading existing database: {e}")

    product_map = {p["id"]: p for p in existing_products}

    # Live mode imports product identity only. Never mix simulated retailer prices into
    # the same catalog file or write them to a production database.
    if run_live:
        print("[*] Fetching product metadata from Open Food Facts. No retailer prices are available from this source.")
        search_terms = ["Albany Bread", "Selati Sugar", "Gold Star Yeast", "Huletts Sugar", "Sasko Bread", "Five Roses Tea", "Ricoffy", "Nola Mayonnaise", "Sunfoil Sunflower Oil"]
        live_products = {}
        for term in search_terms:
            print(f"  -> Searching '{term}'...")
            for raw_p in fetch_open_food_facts_products(term, limit=2):
                name = raw_p.get("product_name_en") or raw_p.get("product_name")
                barcode = raw_p.get("code")
                if not name or not barcode:
                    continue
                categories = raw_p.get("categories_tags") or []
                live_products[f"prod-{barcode}"] = {
                    "id": f"prod-{barcode}", "name": name,
                    "category": categories[0].split(":")[-1].replace("-", " ").capitalize() if categories else "Groceries",
                    "unit": raw_p.get("quantity") or "1 Unit", "isPopular": False,
                    "barcode": barcode, "imageUrl": raw_p.get("image_front_url"), "prices": [],
                    "productSource": "Open Food Facts", "productSourceUrl": f"https://world.openfoodfacts.org/product/{barcode}",
                    "productFetchedAt": datetime.now(timezone.utc).isoformat(), "isDemoData": False
                }
        output_path = os.path.join(os.getcwd(), "open_food_facts_products.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(list(live_products.values()), f, indent=2, ensure_ascii=False)
        print(f"[*] Saved {len(live_products)} product identity records to open_food_facts_products.json. Retailer prices were not changed.")
        if sync_supabase:
            push_to_supabase(list(live_products.values()))
        return
    
    # Process staple items
    print("[*] Syncing South African supermarket pricing indices...")
    for staple in STAPLE_ITEMS:
        base_p = staple.get("base_price", 29.99)
        prod_id = staple["id"]
        staple_copy = dict(staple)
        staple_copy.pop("base_price", None)
        staple_copy["prices"] = generate_prices(base_p)
        product_map[prod_id] = staple_copy
        print(f"  + Synced: {staple_copy['name']} ({staple_copy['unit']})")

    final_list = list(product_map.values())
    
    # Save back to local JSON file
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_list, f, indent=2, ensure_ascii=False)
        print(f"[*] Saved {len(final_list)} items to synced_products.json!")
    except Exception as e:
        print(f"[!] Critical: Failed to save synced_products.json: {e}")
        sys.exit(1)

    # Sync to Supabase
    if sync_supabase:
        push_to_supabase(final_list)

def main():
    print_banner()
    parser = argparse.ArgumentParser(description="Chuse SA retail index price scraper.")
    parser.add_argument("--live", action="store_true", help="Connect to Live Open Food Facts API to scrape real South African product data.")
    parser.add_argument("--mock", action="store_true", help="Run in standard localized simulation mode (instant, no external network requests needed).")
    parser.add_argument("--no-supabase", action="store_true", help="Skip syncing results to Supabase.")
    
    args = parser.parse_args()
    is_live = bool(args.live)
    sync_sb = is_live and not bool(args.no_supabase)
    
    print(f"[*] Mode: {'LIVE PRODUCT METADATA (NO RETAIL PRICES)' if is_live else 'DEMO SIMULATION (LOCAL ONLY)'}")
    scrape_and_update(run_live=is_live, sync_supabase=sync_sb)
    print("=" * 65)

if __name__ == "__main__":
    main()
