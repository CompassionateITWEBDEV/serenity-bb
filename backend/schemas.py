from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from models import UserRole, AppointmentStatus, MessageStatus

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.PATIENT

class UserCreate(UserBase):
    password: str

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
    date_of_birth: Optional[datetime] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    treatment_plan: Optional[str] = None
    medical_history: Optional[Dict[str, Any]] = None
    current_medications: Optional[Dict[str, Any]] = None
    allergies: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    user_id: int
    patient_id: str
    admission_date: Optional[datetime] = None
    user: User
    
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
    patient_id: int
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
