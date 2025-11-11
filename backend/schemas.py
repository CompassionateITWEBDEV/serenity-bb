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
    patient_id: Optional[int] = Field(
        None, description="Target patient ID when created by staff"
    )
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


# Reminder Schemas
class ReminderBase(BaseModel):
    appointment_id: Optional[int] = None
    reminder_type: str
    message: Optional[str] = None
    scheduled_time: datetime
    status: str = "scheduled"


class ReminderCreate(ReminderBase):
    patient_id: int


class ReminderResponse(ReminderBase):
    id: int
    patient_id: int

    class Config:
        from_attributes = True


class ReminderSettings(BaseModel):
    email_enabled: bool = True
    sms_enabled: bool = True
    push_enabled: bool = True
    days_before: List[int] = Field(default_factory=list)
    time_of_day: str = "09:00"

    class Config:
        from_attributes = True


class LeadBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str


class LeadCreate(LeadBase):
    pass


class Lead(LeadBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Staff Schemas
class StaffBase(BaseModel):
    department: Optional[str] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None

class StaffCreate(StaffBase):
    pass

class Staff(StaffBase):
    id: int
    user_id: int
    staff_id: str
    user: Optional[User] = None
    
    class Config:
        from_attributes = True

class StaffUpdate(BaseModel):
    department: Optional[str] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None

# Facial Recognition Schemas
class FaceEncodingBase(BaseModel):
    patient_id: Optional[int] = None
    image_path: Optional[str] = None

class FaceEncodingCreate(FaceEncodingBase):
    pass

class FaceEncodingResponse(FaceEncodingBase):
    id: int
    user_id: int
    is_active: bool
    confidence_score: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class FaceVerificationRequest(BaseModel):
    image_data: str  # Base64 encoded image
    user_id: Optional[int] = None
    patient_id: Optional[int] = None

class FaceVerificationResponse(BaseModel):
    verified: bool
    confidence: float
    matched_user_id: Optional[int] = None
    matched_patient_id: Optional[int] = None
    message: str

class FaceMatchRequest(BaseModel):
    image_data: str  # Base64 encoded image
    threshold: float = 0.6  # Matching threshold (0.0 to 1.0)

class FaceMatchResponse(BaseModel):
    matches: List[Dict[str, Any]]
    best_match: Optional[Dict[str, Any]] = None

# Geolocation Tracking Schemas
class LocationBase(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude between -180 and 180")
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    tracking_type: str = "check_in"
    metadata: Optional[Dict[str, Any]] = None  # This maps to tracking_metadata in the database

class LocationCreate(LocationBase):
    patient_id: Optional[int] = None

class LocationResponse(LocationBase):
    id: int
    user_id: int
    patient_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    is_verified: bool
    verified_by: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class LocationVerifyRequest(BaseModel):
    location_id: int
    verified: bool = True
    notes: Optional[str] = None

class LocationHistoryRequest(BaseModel):
    user_id: Optional[int] = None
    patient_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    tracking_type: Optional[str] = None
    limit: int = 100

class LocationHistoryResponse(BaseModel):
    locations: List[LocationResponse]
    total: int