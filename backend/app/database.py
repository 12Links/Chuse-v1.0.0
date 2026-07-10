from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import sys

# Load environment
load_dotenv()

# Database URL setup
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_NAME", "dataconnect")
INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME", "choose-edec8:us-east4:frontend-fdc")

if not DB_USER or not DB_PASS:
    raise RuntimeError("DB_USER and DB_PASS must be set in backend/.env file")

if os.getenv("K_SERVICE"):
    # Production (Cloud Run)
    host_arg = f"?host=/cloudsql/{INSTANCE_CONNECTION_NAME}"
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@/{DB_NAME}{host_arg}"
else:
    # Local dev
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@127.0.0.1:5432/{DB_NAME}"

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL, 
    echo=False,
    pool_size=5,
    max_overflow=10,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base for ORM models
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()