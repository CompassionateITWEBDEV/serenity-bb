from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/profile", response_model=schemas.Staff)
async def get_staff_profile(
    current_user: Annotated[models.User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """Get current staff member's profile."""
    user_role: models.UserRole = current_user.role  # type: ignore
    if user_role not in [models.UserRole.DOCTOR, models.UserRole.NURSE, models.UserRole.COUNSELOR, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access staff profiles"
        )
    
    staff: Optional[models.Staff] = db.query(models.Staff).filter(models.Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff profile not found"
        )
    
    return staff

@router.put("/profile", response_model=schemas.Staff)
async def update_staff_profile(
    staff_update: schemas.StaffUpdate,
    current_user: Annotated[models.User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """Update current staff member's profile."""
    user_role: models.UserRole = current_user.role  # type: ignore
    if user_role not in [models.UserRole.DOCTOR, models.UserRole.NURSE, models.UserRole.COUNSELOR, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can update staff profiles"
        )
    
    staff: Optional[models.Staff] = db.query(models.Staff).filter(models.Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff profile not found"
        )
    
    # Update staff fields
    for field, value in staff_update.dict(exclude_unset=True).items():
        setattr(staff, field, value)
    
    db.commit()
    db.refresh(staff)
    return staff

@router.get("/", response_model=List[schemas.Staff])
async def get_all_staff(
    current_user: Annotated[models.User, Depends(require_role([models.UserRole.ADMIN]))],
    db: Session = Depends(get_db)
):
    """Get all staff members (admin only)."""
    staff_list: List[models.Staff] = db.query(models.Staff).all()
    return staff_list

@router.get("/{staff_id}", response_model=schemas.Staff)
async def get_staff_by_id(
    staff_id: int,
    current_user: Annotated[models.User, Depends(require_role([models.UserRole.ADMIN, models.UserRole.DOCTOR]))],
    db: Session = Depends(get_db)
):
    """Get staff member by ID (admin and doctors only)."""
    staff: Optional[models.Staff] = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    return staff

