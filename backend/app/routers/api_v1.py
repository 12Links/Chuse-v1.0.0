from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/v1", tags=["v1"])

MOCK_PRODUCTS = [
    {
        "id": "sku-99201",
        "name": "Clover Full Cream Fresh Milk 2L",
        "brand": "Clover",
        "category": "Dairy",
        "prices": [
            {"storeName": "Checkers", "price": 29.99},
            {"storeName": "Pick n Pay", "price": 34.99},
            {"storeName": "Woolworths", "price": 36.99},
            {"storeName": "Spar", "price": 31.50},
        ],
    },
    {
        "id": "sku-55410",
        "name": "Albany Superior White Bread 700g",
        "brand": "Albany",
        "category": "Bakery",
        "prices": [
            {"storeName": "Pick n Pay", "price": 16.50},
            {"storeName": "Checkers", "price": 18.99},
            {"storeName": "Boxer", "price": 15.99},
            {"storeName": "Spar", "price": 17.50},
        ],
    },
    {
        "id": "sku-11204",
        "name": "Ace Super Maize Meal 10kg",
        "brand": "Ace",
        "category": "Grains",
        "prices": [
            {"storeName": "Boxer", "price": 99.99},
            {"storeName": "Makro", "price": 94.50},
            {"storeName": "Checkers", "price": 104.99},
            {"storeName": "Usave", "price": 98.00},
        ],
    },
]

MOCK_USER = {
    "id": "user-001",
    "username": "thabo",
    "email": "thabo@example.com",
    "displayName": "Thabo",
}

MOCK_PERSONAL_BASKET = {
    "basketId": "personal",
    "items": [],
}

MOCK_SHARED_BASKETS = {
    "family-102": {
        "basketId": "family-102",
        "basketName": "Molefe Family Stokvel",
        "items": [
            {
                "id": "item-1",
                "name": "Sunflower Oil 5L",
                "qty": 2,
                "baselinePrice": 149.99,
                "addedBy": "Thabo",
            },
            {
                "id": "item-2",
                "name": "White Sugar 2.5kg",
                "qty": 4,
                "baselinePrice": 42.50,
                "addedBy": "Nomsa",
            },
        ],
        "contributorNodes": [
            {"name": "Thabo", "status": "ACTIVE"},
            {"name": "Nomsa", "status": "ACTIVE"},
            {"name": "Sipho", "status": "PENDING"},
        ],
    }
}

MOCK_STORE_CHAINS = [
    {"id": "checkers", "name": "Checkers", "region": "National"},
    {"id": "pick-n-pay", "name": "Pick n Pay", "region": "National"},
    {"id": "woolworths", "name": "Woolworths", "region": "National"},
    {"id": "boxer", "name": "Boxer", "region": "National"},
    {"id": "spar", "name": "Spar", "region": "National"},
    {"id": "makro", "name": "Makro", "region": "National"},
]


@router.post("/auth/login")
def login(payload: dict):
    email = payload.get("email", "")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    return {
        "access_token": "demo-access-token",
        "token_type": "bearer",
        "user": {**MOCK_USER, "email": email},
    }


@router.post("/auth/register")
def register(payload: dict):
    username = payload.get("username", "")
    email = payload.get("email", "")
    if not username or not email:
        raise HTTPException(status_code=400, detail="Username and email are required")
    return {
        "status": "ok",
        "user": {**MOCK_USER, "username": username, "email": email},
    }


@router.get("/users/me")
def get_current_user():
    return MOCK_USER


@router.get("/products/search")
def search_products(
    q: str = Query(default=""),
    dietary: str = Query(default="None"),
    strategy: str = Query(default="Absolute Lowest Price"),
):
    query = q.strip().lower()
    if not query:
        return []

    results = [
        product
        for product in MOCK_PRODUCTS
        if query in product["name"].lower() or query in product["brand"].lower()
    ]
    return results


@router.get("/products/specials")
def product_specials(limit: int = Query(default=10, ge=1, le=50)):
    return MOCK_PRODUCTS[:limit]


@router.get("/products/{product_id}")
def get_product(product_id: str):
    for product in MOCK_PRODUCTS:
        if product["id"] == product_id:
            return product
    raise HTTPException(status_code=404, detail="Product not found")


@router.get("/stores/chains")
def get_store_chains():
    return MOCK_STORE_CHAINS


@router.get("/stores/nearby")
def get_nearby_stores(
    lat: float = Query(default=-26.2041),
    lng: float = Query(default=28.0473),
    radius: float = Query(default=15),
):
    return {
        "latitude": lat,
        "longitude": lng,
        "radiusKm": radius,
        "stores": [
            {"name": "Checkers Sandton", "distanceKm": 2.4},
            {"name": "Pick n Pay Rosebank", "distanceKm": 3.1},
            {"name": "Woolworths Hyde Park", "distanceKm": 4.8},
        ],
    }


@router.get("/baskets/personal")
def get_personal_basket():
    return MOCK_PERSONAL_BASKET


@router.get("/baskets/shared/{basket_id}")
def get_shared_basket(basket_id: str):
    basket = MOCK_SHARED_BASKETS.get(basket_id)
    if not basket:
        raise HTTPException(status_code=404, detail="Shared basket not found")
    return basket


@router.post("/baskets/{basket_id}/items")
def append_basket_item(basket_id: str, payload: dict):
    item = {
        "id": payload.get("product_id") or f"item-{len(MOCK_PERSONAL_BASKET['items']) + 1}",
        "name": payload.get("name", "Staged item"),
        "qty": payload.get("quantity", 1),
        "addedBy": payload.get("added_by", "Unknown"),
    }

    if basket_id == "personal":
        MOCK_PERSONAL_BASKET["items"].append(item)
        return MOCK_PERSONAL_BASKET

    shared = MOCK_SHARED_BASKETS.get(basket_id)
    if not shared:
        raise HTTPException(status_code=404, detail="Basket not found")
    shared["items"].append(item)
    return shared


@router.delete("/baskets/{basket_id}/items/{item_id}")
def remove_basket_item(basket_id: str, item_id: str):
    target = MOCK_PERSONAL_BASKET if basket_id == "personal" else MOCK_SHARED_BASKETS.get(basket_id)
    if not target:
        raise HTTPException(status_code=404, detail="Basket not found")

    target["items"] = [item for item in target["items"] if item.get("id") != item_id]
    return target


@router.post("/basket/sync")
def sync_basket(payload: dict):
    items = payload.get("items", [])
    MOCK_PERSONAL_BASKET["items"] = items
    return {"status": "ok", "items": items}
