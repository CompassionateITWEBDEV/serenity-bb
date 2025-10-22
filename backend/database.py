from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings
import os

# Create SQLAlchemy engine
# Use Supabase PostgreSQL if available, otherwise SQLite for development
database_url = settings.database_url

# If no database URL is provided, use SQLite for development
if not database_url:
    database_url = "sqlite:///./serenity_rehab.db"
    print("⚠️ No DATABASE_URL provided, using SQLite for development")

# Create engine with appropriate configuration
if database_url.startswith("postgresql://") or database_url.startswith("postgres://"):
    # PostgreSQL configuration for Supabase
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=settings.debug,
        # Additional PostgreSQL-specific settings
        connect_args={
            "options": "-c timezone=utc"
        } if "supabase" in database_url.lower() else {}
    )
    print("✅ Using Supabase PostgreSQL database")
else:
    # SQLite configuration for development
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
        echo=settings.debug
    )
    print("⚠️ Using SQLite for development")

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Health check function
def check_database_connection():
    """Check if database connection is working"""
    try:
        with engine.connect() as connection:
            from sqlalchemy import text
            connection.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
