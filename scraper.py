#!/usr/bin/env python3
import os
import sys
import json
import random
import argparse
import urllib.request
import urllib.parse
from datetime import datetime

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
        "barcode": "6001234567890",
        "imageUrl": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
        "base_price": 38.99
    },
    {
        "id": "prod-bread-sasko",
        "name": "Sasko Premium White Bread",
        "category": "Bakery",
        "unit": "700g",
        "isPopular": True,
        "barcode": "6009876543210",
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
    }
]

def print_banner():
    print("=" * 65)
    print("       CHUSE.CO.ZA - SOUTH AFRICAN GROCERY PRICING SCRAPER      ")
    print("=" * 65)

def fetch_open_food_facts_products(query_term, limit=5):
    """
    Fetches real products from Open Food Facts API for South Africa
    """
    url = f"https://za.openfoodfacts.org/cgi/search.pl?search_terms={urllib.parse.quote(query_term)}&search_simple=1&action=process&json=1&page_size={limit}"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'ChuseSA/1.0.0 (jackympoka22@gmail.com)'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            products = data.get('products', [])
            return products
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
        
        # Rounded to 2 decimals, usually ending in .99 or .50 or .95
        price_val = round(store_base, 2)
        
        # Randomly apply weekly specials (20% chance)
        on_special = random.random() < 0.20
        special_detail = ""
        
        if on_special:
            discount = random.uniform(0.08, 0.18)
            promo_price = round(price_val * (1 - discount), 2)
            
            # Format custom promo detail strings common in SA
            promo_types = [
                f"Save R{round(price_val - promo_price, 1)}0 with {config['loyalty']}",
                f"Buy 2 for R{round(promo_price * 2, 1)}0",
                f"Special Promo Price"
            ]
            special_detail = random.choice(promo_types) if config["loyalty"] != "None" else "Weekly Special Price"
            price_val = promo_price
            
        prices.append({
            "storeId": store_id,
            "price": price_val,
            "onSpecial": on_special,
            "specialDetail": special_detail,
            "inStock": random.random() < 0.96 # 96% in-stock rate
        })
    return prices

def scrape_and_update(run_live=False):
    output_path = os.path.join(os.getcwd(), "synced_products.json")
    
    # Load existing items to preserve user modifications
    existing_products = []
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing_products = json.load(f)
                print(f"[*] Loaded {len(existing_products)} existing items from synced_products.json")
        except Exception as e:
            print(f"[!] Error reading existing database, starting fresh: {e}")

    # Build Map of existing items
    product_map = {p["id"]: p for p in existing_products}
    
    # Process core staples
    print("[*] Syncing core South African staple indices...")
    for staple in STAPLE_ITEMS:
        base_p = staple.pop("base_price", 25.0)
        prod_id = staple["id"]
        
        # Generate new prices
        staple["prices"] = generate_prices(base_p)
        product_map[prod_id] = staple
        print(f"  + Synced core product: {staple['name']} ({staple['unit']})")

    # If live mode requested, query Open Food Facts API for additional real SA retail items
    if run_live:
        print("[*] Live integration active. Contacting South African Open Food Facts index...")
        search_staples = ["Albany Bread", "Selati Sugar", "Gold Star Yeast", "Huletts", "Sasko", "Five Roses Tea", "Ricoffy", "Nola Mayonnaise", "Sunfoil"]
        
        for term in search_staples:
            print(f"  -> Indexing query term: '{term}'...")
            raw_products = fetch_open_food_facts_products(term, limit=2)
            
            for raw_p in raw_products:
                name = raw_p.get("product_name_en") or raw_p.get("product_name")
                barcode = raw_p.get("code")
                
                if not name or not barcode:
                    continue
                    
                # Clean clean fields
                prod_id = f"prod-{barcode}"
                category = raw_p.get("categories_tags", ["Groceries"])[0].split(":")[-1].replace("-", " ").capitalize()
                unit = raw_p.get("quantity") or "1 Unit"
                image_url = raw_p.get("image_front_url") or "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80"
                
                # Assign baseline price for pricing variance simulations
                assigned_base = random.uniform(18.0, 95.0)
                
                new_item = {
                    "id": prod_id,
                    "name": name,
                    "category": category,
                    "unit": unit,
                    "isPopular": False,
                    "barcode": barcode,
                    "imageUrl": image_url,
                    "prices": generate_prices(assigned_base)
                }
                
                product_map[prod_id] = new_item
                print(f"    [Success] Fetched & Indexed: {name} (Barcode: {barcode})")
                
    # Convert map back to list
    final_list = list(product_map.values())
    
    # Save back to file
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_list, f, indent=2, ensure_ascii=False)
        print(f"[*] Sync process finished. Totally {len(final_list)} items stored in synced_products.json!")
    except Exception as e:
        print(f"[!] Critical: Failed to save synced_products.json: {e}")
        sys.exit(1)

def main():
    print_banner()
    parser = argparse.ArgumentParser(description="Chuse SA retail index price scraper.")
    parser.add_argument("--live", action="store_true", help="Connect to Live Open Food Facts API to scrape real South African product data.")
    parser.add_argument("--mock", action="store_true", help="Run in standard localized simulation mode (instant, no external network requests needed).")
    
    args = parser.parse_args()
    
    # Default to live if specified, otherwise mock simulation
    is_live = args.live if args.live else False
    
    print(f"[*] Running in {'LIVE API' if is_live else 'MOCK SIMULATION'} mode...")
    scrape_and_update(run_live=is_live)
    print("=" * 65)

if __name__ == "__main__":
    main()
