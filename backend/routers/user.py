from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend import schemas, models
from backend.database import get_db
from backend.auth import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)

@router.get("/me", response_model=schemas.User)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.User)
def update_user_profile(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user
