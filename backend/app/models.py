from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    uid = Column(String, primary_key=True, index=True)  # Supabase Auth User ID (UUID)
    email = Column(String, unique=True, index=True)
    displayName = Column(String)
    avatarUrl = Column(String, nullable=True)
    loyaltyCards = Column(JSON, default={})  # JSON: {checkers: bool, pnp: bool, ...}
    preferredStoreLocation = Column(String, default="Gauteng")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Store(Base):
    __tablename__ = "stores"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    prices = relationship("PricePoint", back_populates="store")
    history = relationship("PriceHistory", back_populates="store")

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)
    unit = Column(String)
    isPopular = Column(Boolean, default=False)
    barcode = Column(String, unique=True)
    imageUrl = Column(String)

    prices = relationship("PricePoint", back_populates="product")
    history = relationship("PriceHistory", back_populates="product")

class PricePoint(Base):
    __tablename__ = "price_points"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"))
    store_id = Column(String, ForeignKey("stores.id"), index=True)
    price = Column(Float)
    last_updated = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="prices")
    store = relationship("Store", back_populates="prices")

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"))
    store_id = Column(String, ForeignKey("stores.id"))
    price = Column(Float)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="history")
    store = relationship("Store", back_populates="history")