from datetime import timedelta
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
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Try to create user in Supabase if available
    supabase_patient = None
    if supabase_client.is_available():
        try:
            supabase_user_data = {
                "email": user.email,
                "hashed_password": get_password_hash(user.password),
                "full_name": f"{user.first_name} {user.last_name}",
                "is_active": True,
                "role": user.role
            }
            supabase_user = await supabase_client.create_user(supabase_user_data)
            
            if user.role == "patient" and supabase_user:
                supabase_patient_data = {
                    "user_id": supabase_user["id"],
                    "date_of_birth": getattr(user, 'date_of_birth', None),
                    "phone_number": getattr(user, 'phone_number', None),
                    "emergency_contact_name": getattr(user, 'emergency_contact_name', None),
                    "emergency_contact_phone": getattr(user, 'emergency_contact_phone', None),
                    "emergency_contact_relationship": getattr(user, 'emergency_contact_relationship', None),
                    "treatment_plan": getattr(user, 'treatment_plan', None)
                }
                supabase_patient = await supabase_client.create_patient(supabase_patient_data)
        except Exception as e:
            # Log error but continue with local registration
            print(f"Supabase registration failed: {e}")
    
    # Create new user in local database with full patient information
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=f"{user.first_name} {user.last_name}",
        is_active=True,
        role=user.role or "patient"
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create patient profile with all the collected data
    if user.role == "patient" or not user.role:
        db_patient = models.Patient(
            user_id=db_user.id,
            date_of_birth=getattr(user, 'date_of_birth', None),
            phone_number=getattr(user, 'phone_number', None),
            emergency_contact_name=getattr(user, 'emergency_contact_name', None),
            emergency_contact_phone=getattr(user, 'emergency_contact_phone', None),
            emergency_contact_relationship=getattr(user, 'emergency_contact_relationship', None),
            treatment_plan=getattr(user, 'treatment_plan', None),
            status='active'
        )
        db.add(db_patient)
        db.commit()
    
    # Create staff profile if user is staff
    elif user.role in ["doctor", "nurse", "counselor", "admin"]:
        db_staff = models.Staff(
            user_id=db_user.id,
            staff_type=user.role,
            phone_number=getattr(user, 'phone_number', None),
            is_available=True
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
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    
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
    
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.post("/logout")
async def logout_user(current_user: models.User = Depends(get_current_active_user)):
    """Logout user (client should discard token)."""
    return {"message": "Successfully logged out"}
