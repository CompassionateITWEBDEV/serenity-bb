from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from models import UserRole, AppointmentStatus, MessageStatus

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "patient"

class UserCreate(UserBase):
    password: str
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    phone_number: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    treatment_plan: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Patient Schemas
class PatientBase(BaseModel):
    date_of_birth: Optional[date] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    treatment_plan: Optional[str] = None
    medical_history: Optional[str] = None
    current_medications: Optional[str] = None
    allergies: Optional[str] = None
    status: Optional[str] = "active"

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    user_id: int
    admission_date: Optional[date] = None
    discharge_date: Optional[date] = None
    avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Appointment Schemas
class AppointmentBase(BaseModel):
    appointment_type: str
    scheduled_datetime: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    staff_id: int

class Appointment(AppointmentBase):
    id: int
    patient_id: int
    staff_id: int
    status: AppointmentStatus
    created_at: datetime
    
    class Config:
        from_attributes = True

# Message Schemas
class MessageBase(BaseModel):
    subject: Optional[str] = None
    content: str
    is_group_message: bool = False

class MessageCreate(MessageBase):
    recipient_id: Optional[int] = None
    group_id: Optional[int] = None

class Message(MessageBase):
    id: int
    sender_id: int
    recipient_id: Optional[int] = None
    group_id: Optional[int] = None
    status: MessageStatus
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Medication Log Schemas
class MedicationLogBase(BaseModel):
    medication_name: str
    dosage: Optional[str] = None
    notes: Optional[str] = None
    side_effects: Optional[str] = None

class MedicationLogCreate(MedicationLogBase):
    pass

class MedicationLog(MedicationLogBase):
    id: int
    patient_id: int
    taken_at: datetime
    
    class Config:
        from_attributes = True

# Video Recording Schemas
class VideoRecordingBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class VideoRecordingCreate(VideoRecordingBase):
    pass

class VideoRecording(VideoRecordingBase):
    id: int
    patient_id: int
    file_path: str
    duration_seconds: Optional[int] = None
    file_size_bytes: Optional[int] = None
    recorded_at: datetime
    
    class Config:
        from_attributes = True

# Activity Log Schemas
class ActivityLogBase(BaseModel):
    activity_type: str
    activity_name: Optional[str] = None
    duration_minutes: Optional[int] = None
    score: Optional[float] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ActivityLogCreate(ActivityLogBase):
    pass

class ActivityLog(ActivityLogBase):
    id: int
    patient_id: int
    completed_at: datetime
    
    class Config:
        from_attributes = True

# Group Schemas
class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    group_type: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class Group(GroupBase):
    id: int
    created_by: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Reward Token Schemas
class RewardTokenBase(BaseModel):
    tokens_earned: int = 0
    tokens_spent: int = 0
    total_tokens: int = 0
    level: int = 1

class RewardToken(RewardTokenBase):
    id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Token Transaction Schemas
class TokenTransactionBase(BaseModel):
    transaction_type: str  # 'earned' or 'spent'
    amount: int
    reason: str
    source_type: str  # 'appointment', 'video_upload', etc.
    source_id: Optional[int] = None
    description: Optional[str] = None

class TokenTransactionCreate(TokenTransactionBase):
    pass

class TokenTransaction(TokenTransactionBase):
    id: int
    patient_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Rewards Catalog Schemas
class RewardsCatalogBase(BaseModel):
    name: str
    description: Optional[str] = None
    cost_tokens: int
    category: str  # 'privilege', 'item', 'experience'
    is_active: bool = True

class RewardsCatalogCreate(RewardsCatalogBase):
    pass

class RewardsCatalog(RewardsCatalogBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Patient Reward Schemas
class PatientRewardBase(BaseModel):
    reward_id: int
    tokens_spent: int
    status: str = 'active'  # 'active', 'used', 'expired'

class PatientRewardCreate(PatientRewardBase):
    pass

class PatientReward(PatientRewardBase):
    id: int
    patient_id: int
    redeemed_at: datetime
    reward: Optional[RewardsCatalog] = None
    
    class Config:
        from_attributes = True

# Gamification Response Schemas
class TokenAwardResponse(BaseModel):
    tokens_awarded: int
    new_total: int
    level: int
    level_up: bool = False
    message: str

class PatientProgress(BaseModel):
    patient_id: int
    tokens: RewardToken
    recent_transactions: List[TokenTransaction]
    available_rewards: List[RewardsCatalog]
    redeemed_rewards: List[PatientReward]
