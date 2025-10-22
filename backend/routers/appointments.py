from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=schemas.Appointment)
async def create_appointment(
    appointment: schemas.AppointmentCreate,
    current_user: models.User = Depends(
        require_role(
            [
                models.UserRole.DOCTOR,
                models.UserRole.NURSE,
                models.UserRole.ADMIN,
                models.UserRole.PATIENT,
            ]
        )
    ),
    db: Session = Depends(get_db)
):
    """Create a new appointment.

    Patients may create appointments for themselves. Staff members must
    provide a `patient_id` to schedule on behalf of a patient.
    """
    # Get patient from current user if they're a patient, or from appointment data if staff
    user_role: models.UserRole = current_user.role  # type: ignore
    if user_role == models.UserRole.PATIENT:
        patient: Optional[models.Patient] = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found"
            )
        patient_id = patient.id
    else:
        if appointment.patient_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="patient_id is required for staff-created appointments"
            )
        patient = db.query(models.Patient).filter(models.Patient.id == appointment.patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        patient_id = patient.id
    
    db_appointment = models.Appointment(
        patient_id=patient_id,
        staff_id=appointment.staff_id,
        appointment_type=appointment.appointment_type,
        scheduled_datetime=appointment.scheduled_datetime,
        duration_minutes=appointment.duration_minutes,
        notes=appointment.notes
    )
    
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@router.get("/my-appointments", response_model=List[schemas.Appointment])
async def get_my_appointments(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's appointments."""
    query = db.query(models.Appointment)
    
    user_role: models.UserRole = current_user.role  # type: ignore
    if user_role == models.UserRole.PATIENT:
        patient: Optional[models.Patient] = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
        if not patient:
            return []
        patient_id: int = patient.id  # type: ignore
        query = query.filter(models.Appointment.patient_id == patient_id)
    else:
        # For staff, get appointments they're assigned to
        staff: Optional[models.Staff] = db.query(models.Staff).filter(models.Staff.user_id == current_user.id).first()
        if not staff:
            return []
        query = query.filter(models.Appointment.staff_id == staff.id)
    
    if start_date:
        query = query.filter(models.Appointment.scheduled_datetime >= start_date)
    if end_date:
        query = query.filter(models.Appointment.scheduled_datetime <= end_date)
    
    appointments = query.order_by(models.Appointment.scheduled_datetime).all()
    return appointments

@router.put("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: int,
    appointment_status: models.AppointmentStatus,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update appointment status."""
    appointment: Optional[models.Appointment] = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check permissions
    user_role: models.UserRole = current_user.role  # type: ignore
    if user_role == models.UserRole.PATIENT:
        patient: Optional[models.Patient] = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
        patient_id: int = appointment.patient_id  # type: ignore
        if not patient or patient_id != patient.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this appointment"
            )
    
    setattr(appointment, 'status', appointment_status)
    db.commit()
    return {"message": "Appointment status updated successfully"}
