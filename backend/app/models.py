from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

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
    store_id = Column(String, index=True)
    price = Column(Float)
    last_updated = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="prices")

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"))
    store_id = Column(String)
    price = Column(Float)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="history")