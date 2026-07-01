from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional
import asyncpg
from ..auth import get_current_user
from ..models import User
from ..database import get_db

router = APIRouter(prefix="/api/v1", tags=["v1"])

# Pydantic models for request/response
class UserProfileUpdate(BaseModel):
    displayName: Optional[str] = None
    avatarUrl: Optional[str] = None
    loyaltyCards: Optional[dict] = None
    preferredStoreLocation: Optional[str] = None

class UserProfileResponse(BaseModel):
    uid: str
    email: str
    displayName: str
    avatarUrl: Optional[str] = None
    loyaltyCards: dict
    preferredStoreLocation: str

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


@router.post("/auth/register")
def register(payload: dict, db: Session = Depends(get_db)):
    """Register a new user with Firebase and sync to database."""
    uid = payload.get("uid")
    email = payload.get("email")
    displayName = payload.get("displayName", "")
    
    if not uid or not email:
        raise HTTPException(status_code=400, detail="uid and email are required")
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="User already exists")
    
    # Create new user
    new_user = User(
        uid=uid,
        email=email,
        displayName=displayName,
        loyaltyCards=payload.get("loyaltyCards", {}),
        preferredStoreLocation=payload.get("preferredStoreLocation", "Gauteng")
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "status": "ok",
        "user": {
            "uid": new_user.uid,
            "email": new_user.email,
            "displayName": new_user.displayName,
            "loyaltyCards": new_user.loyaltyCards,
            "preferredStoreLocation": new_user.preferredStoreLocation
        }
    }


@router.post("/auth/sync-profile")
def sync_profile(token_info: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sync user profile with Firebase token."""
    uid = token_info.get("uid")
    email = token_info.get("email")
    
    if not uid or not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    # Get or create user
    user = db.query(User).filter(User.uid == uid).first()
    
    if not user:
        user = User(
            uid=uid,
            email=email,
            displayName=email.split("@")[0],
            loyaltyCards={},
            preferredStoreLocation="Gauteng"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return {
        "uid": user.uid,
        "email": user.email,
        "displayName": user.displayName,
        "avatarUrl": user.avatarUrl,
        "loyaltyCards": user.loyaltyCards,
        "preferredStoreLocation": user.preferredStoreLocation
    }


@router.get("/users/me", response_model=UserProfileResponse)
def get_current_user_profile(token_info: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current authenticated user profile."""
    uid = token_info.get("uid")
    
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.put("/users/me", response_model=UserProfileResponse)
def update_user_profile(
    update_data: UserProfileUpdate,
    token_info: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile."""
    uid = token_info.get("uid")
    
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if update_data.displayName is not None:
        user.displayName = update_data.displayName
    if update_data.avatarUrl is not None:
        user.avatarUrl = update_data.avatarUrl
    if update_data.loyaltyCards is not None:
        user.loyaltyCards = update_data.loyaltyCards
    if update_data.preferredStoreLocation is not None:
        user.preferredStoreLocation = update_data.preferredStoreLocation
    
    db.commit()
    db.refresh(user)
    
    return user


@router.post("/auth/login")
def login(token_info: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verify and sync user profile on login."""
    uid = token_info.get("uid")
    email = token_info.get("email")
    
    if not uid or not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    # Get or create user
    user = db.query(User).filter(User.uid == uid).first()
    
    if not user:
        user = User(
            uid=uid,
            email=email,
            displayName=email.split("@")[0],
            loyaltyCards={},
            preferredStoreLocation="Gauteng"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return {
        "status": "ok",
        "user": {
            "uid": user.uid,
            "email": user.email,
            "displayName": user.displayName,
            "avatarUrl": user.avatarUrl,
            "loyaltyCards": user.loyaltyCards,
            "preferredStoreLocation": user.preferredStoreLocation
        }
    }
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
