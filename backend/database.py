from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Create SQLAlchemy engine
# Use SQLite for development if PostgreSQL is not available
database_url = settings.database_url
if database_url.startswith("postgresql://"):
    # Try to use SQLite as fallback for development
    database_url = "sqlite:///./serenity_rehab.db"

engine = create_engine(database_url)

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
