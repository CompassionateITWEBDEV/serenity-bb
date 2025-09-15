from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
# Database
database_url: str


# JWT
secret_key: str
algorithm: str = "HS256"
access_token_expire_minutes: int = 30


# CORS
allowed_origins: List[str] = ["http://localhost:3000"]
allow_origin_regex: Optional[str] = None # e.g., r"https://.*\.vercel\.app$"


# File Upload
max_file_size: int = 10 * 1024 * 1024 # 10MB
upload_dir: str = "uploads"


# Optional integrations
supabase_url: Optional[str] = None
supabase_anon_key: Optional[str] = None


model_config = SettingsConfigDict(env_file=".env", env_prefix="SR_", case_sensitive=False)


settings = Settings()
