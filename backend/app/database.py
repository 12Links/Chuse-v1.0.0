import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def check_database_connection():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database_url": DATABASE_URL,
            "message": "Database connection successful",
        }
    except Exception as exc:
        return {
            "status": "error",
            "database_url": DATABASE_URL,
            "message": str(exc),
        }
