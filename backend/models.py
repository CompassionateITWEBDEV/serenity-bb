from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from enum import Enum

class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    NURSE = "nurse"
    COUNSELOR = "counselor"
    ADMIN = "admin"

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class MessageStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String)
    role = Column(String, default=UserRole.PATIENT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    staff_profile = relationship("Staff", back_populates="user", uselist=False)
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.recipient_id", back_populates="recipient")

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    patient_id = Column(String, unique=True, index=True)  # Medical record number
    date_of_birth = Column(DateTime)
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)
    insurance_provider = Column(String)
    insurance_policy_number = Column(String)
    admission_date = Column(DateTime)
    treatment_plan = Column(Text)
    medical_history = Column(JSON)
    current_medications = Column(JSON)
    allergies = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient")
    medication_logs = relationship("MedicationLog", back_populates="patient")
    video_recordings = relationship("VideoRecording", back_populates="patient")
    activity_logs = relationship("ActivityLog", back_populates="patient")

class Staff(Base):
    __tablename__ = "staff"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    staff_id = Column(String, unique=True, index=True)
    department = Column(String)
    specialization = Column(String)
    license_number = Column(String)
    
    # Relationships
    user = relationship("User", back_populates="staff_profile")
    appointments = relationship("Appointment", back_populates="staff_member")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    staff_id = Column(Integer, ForeignKey("staff.id"))
    appointment_type = Column(String)  # consultation, therapy, group_session, etc.
    scheduled_datetime = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    status = Column(String, default=AppointmentStatus.SCHEDULED)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    staff_member = relationship("Staff", back_populates="appointments")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"))
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    subject = Column(String)
    content = Column(Text, nullable=False)
    status = Column(String, default=MessageStatus.SENT)
    is_group_message = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")
    group = relationship("Group", back_populates="messages")

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    group_type = Column(String)  # therapy_group, support_group, etc.
    created_by = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    messages = relationship("Message", back_populates="group")
    members = relationship("GroupMember", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    is_moderator = Column(Boolean, default=False)
    
    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User")

class MedicationLog(Base):
    __tablename__ = "medication_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    medication_name = Column(String, nullable=False)
    dosage = Column(String)
    taken_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)
    side_effects = Column(Text)
    
    # Relationships
    patient = relationship("Patient", back_populates="medication_logs")

class VideoRecording(Base):
    __tablename__ = "video_recordings"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    title = Column(String)
    description = Column(Text)
    file_path = Column(String, nullable=False)
    duration_seconds = Column(Integer)
    file_size_bytes = Column(Integer)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="video_recordings")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    activity_type = Column(String, nullable=False)  # game, exercise, therapy, etc.
    activity_name = Column(String)
    duration_minutes = Column(Integer)
    score = Column(Float, nullable=True)
    notes = Column(Text)
    metadata = Column(JSON)  # Additional activity-specific data
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="activity_logs")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    reminder_type = Column(String, nullable=False)
    message = Column(Text)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="scheduled")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    patient = relationship("Patient")
    appointment = relationship("Appointment")


class ReminderSettings(Base):
    __tablename__ = "reminder_settings"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    push_enabled = Column(Boolean, default=True)
    days_before = Column(JSON, default=list)
    time_of_day = Column(String, default="09:00")

    # Relationships
    patient = relationship("Patient")
