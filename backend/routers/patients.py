from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/profile", response_model=schemas.Patient)
async def get_patient_profile(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current patient's profile."""
    if current_user.role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access patient profiles"
        )
    
    patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    return patient

@router.put("/profile", response_model=schemas.Patient)
async def update_patient_profile(
    patient_update: schemas.PatientCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current patient's profile."""
    if current_user.role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can update patient profiles"
        )
    
    patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    # Update patient fields
    for field, value in patient_update.dict(exclude_unset=True).items():
        setattr(patient, field, value)
    
    db.commit()
    db.refresh(patient)
    return patient

@router.get("/", response_model=List[schemas.Patient])
async def get_all_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: models.User = Depends(require_role([models.UserRole.DOCTOR, models.UserRole.NURSE, models.UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Get all patients (staff only)."""
    patients = db.query(models.Patient).offset(skip).limit(limit).all()
    return patients

@router.get("/{patient_id}", response_model=schemas.Patient)
async def get_patient_by_id(
    patient_id: int,
    current_user: models.User = Depends(require_role([models.UserRole.DOCTOR, models.UserRole.NURSE, models.UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Get patient by ID (staff only)."""
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return patient
