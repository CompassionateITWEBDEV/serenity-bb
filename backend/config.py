from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    # Supabase Configuration (matches frontend)
    supabase_url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Database (Supabase PostgreSQL)
    database_url: str = os.getenv("DATABASE_URL", "")
    
    # JWT Configuration
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # CORS Configuration
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://src.health",
        "https://serenity-b9.onrender.com"
    ]
    
    # File Upload Configuration
    max_file_size: int = int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))  # 10MB
    upload_dir: str = os.getenv("UPLOAD_DIR", "uploads")
    
    # API Configuration
    api_version: str = "v1"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validate required Supabase configuration
        if not self.supabase_url or not self.supabase_anon_key:
            print("Warning: Supabase configuration missing. Some features may not work.")
        if not self.database_url:
            print("Warning: Database URL not configured. Database features will not work.")

settings = Settings()
