from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import authenticate_user, create_access_token, get_password_hash, get_current_active_user
from config import settings
from supabase_client import supabase_client

router = APIRouter()

@router.post("/register", response_model=schemas.User)
async def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user with Supabase integration."""
    # Check if user already exists in local database
    db_user: Optional[models.User] = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Try to create patient in Supabase if available
    supabase_patient = None
    if supabase_client.is_available():
        try:
            supabase_patient = await supabase_client.create_patient({
                "email": user.email,
                "password_hash": get_password_hash(user.password),
                "full_name": f"{user.first_name} {user.last_name}",
                "phone_number": user.phone,
                "is_active": True
            })
        except Exception as e:
            # Log error but continue with local registration
            print(f"Supabase registration failed: {e}")
    
    # Create new user in local database
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        role=user.role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create patient profile if user is a patient
    user_role: models.UserRole = user.role  # type: ignore
    if user_role == models.UserRole.PATIENT:
        patient_id = f"PAT{db_user.id:06d}"
        db_patient = models.Patient(
            user_id=db_user.id,
            patient_id=patient_id
        )
        db.add(db_patient)
        db.commit()
    
    # Create staff profile if user is staff
    elif user_role in [models.UserRole.DOCTOR, models.UserRole.NURSE, models.UserRole.COUNSELOR]:
        staff_id = f"STF{db_user.id:06d}"
        db_staff = models.Staff(
            user_id=db_user.id,
            staff_id=staff_id
        )
        db.add(db_staff)
        db.commit()
    
    return db_user

@router.post("/login", response_model=schemas.Token)
async def login_user(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login user with Supabase verification."""
    # First try Supabase authentication if available
    if supabase_client.is_available():
        try:
            supabase_patient = await supabase_client.get_patient_by_email(login_data.email)
            if supabase_patient:
                # Verify password against Supabase record
                from auth import verify_password
                if verify_password(login_data.password, supabase_patient.get('password_hash', '')):
                    # Update last login in Supabase
                    await supabase_client.update_patient(
                        supabase_patient['id'], 
                        {'last_login': 'now()'}
                    )
        except Exception as e:
            print(f"Supabase login check failed: {e}")
    
    # Continue with local authentication
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """OAuth2 compatible token login."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@router.put("/me", response_model=schemas.User)
async def update_user_me(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user information."""
    if user_update.first_name is not None:
        setattr(current_user, 'first_name', user_update.first_name)
    if user_update.last_name is not None:
        setattr(current_user, 'last_name', user_update.last_name)
    if user_update.phone is not None:
        setattr(current_user, 'phone', user_update.phone)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password."""
    from auth import verify_password
    
    hashed_password: str = current_user.hashed_password  # type: ignore
    if not verify_password(current_password, hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    setattr(current_user, 'hashed_password', get_password_hash(new_password))
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.post("/logout")
async def logout_user(current_user: models.User = Depends(get_current_active_user)):
    """Logout user (client should discard token)."""
    return {"message": "Successfully logged out"}
