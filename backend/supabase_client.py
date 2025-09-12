import os
from supabase import create_client, Client
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    _instance: Optional['SupabaseClient'] = None
    _client: Optional[Client] = None

    def __new__(cls) -> 'SupabaseClient':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None:
            self._initialize_client()

    def _initialize_client(self):
        """Initialize Supabase client with environment variables."""
        supabase_url = os.getenv("SUPABASE_URL", "https://cycakdfxcsjknxkqpasp.supabase.co")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        if not supabase_key:
            logger.warning("Supabase anon key not found. Using fallback mode.")
            return
        
        try:
            self._client = create_client(supabase_url, supabase_key)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")

    @property
    def client(self) -> Optional[Client]:
        """Get the Supabase client instance."""
        return self._client

    def is_available(self) -> bool:
        """Check if Supabase client is available."""
        return self._client is not None

    async def create_patient(self, patient_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new patient record in Supabase."""
        if not self.is_available():
            return None
        
        try:
            clean_patient_data = {k: v for k, v in patient_data.items() 
                                if k not in ['updated_at', 'created_at']}
            
            result = self._client.table("patients").insert(clean_patient_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to create patient: {e}")
            return None

    async def get_patient_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get patient by email from Supabase."""
        if not self.is_available():
            return None
        
        try:
            result = self._client.table("users").select("*, patients(*)").eq("email", email).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to get patient by email: {e}")
            return None

    async def update_patient(self, patient_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update patient record in Supabase."""
        if not self.is_available():
            return None
        
        try:
            clean_update_data = {k: v for k, v in update_data.items() if k != 'updated_at'}
            
            result = self._client.table("patients").update(clean_update_data).eq("id", patient_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to update patient: {e}")
            return None

    async def create_intake_form(self, form_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create intake form submission in Supabase."""
        if not self.is_available():
            return None
        
        try:
            result = self._client.table("intake_forms").insert(form_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to create intake form: {e}")
            return None

    async def get_patient_intake_forms(self, patient_id: str) -> list:
        """Get all intake forms for a patient."""
        if not self.is_available():
            return []
        
        try:
            result = self._client.table("intake_forms").select("*").eq("patient_id", patient_id).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get intake forms: {e}")
            return []

    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new user record in Supabase."""
        if not self.is_available():
            return None
        
        try:
            clean_user_data = {k: v for k, v in user_data.items() 
                             if k not in ['updated_at', 'created_at']}
            
            result = self._client.table("users").insert(clean_user_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return None

# Global instance
supabase_client = SupabaseClient()
