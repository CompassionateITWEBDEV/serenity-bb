from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=schemas.Group)
async def create_group(
    group: schemas.GroupCreate,
    current_user: models.User = Depends(require_role([models.UserRole.DOCTOR, models.UserRole.COUNSELOR, models.UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a new group (staff only)."""
    db_group = models.Group(
        name=group.name,
        description=group.description,
        group_type=group.group_type,
        created_by=current_user.id
    )
    
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # Add creator as moderator
    db_member = models.GroupMember(
        group_id=db_group.id,
        user_id=current_user.id,
        is_moderator=True
    )
    db.add(db_member)
    db.commit()
    
    return db_group

@router.get("/my-groups", response_model=List[schemas.Group])
async def get_my_groups(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get groups that current user is a member of."""
    groups = db.query(models.Group).join(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id,
        models.Group.is_active == True
    ).all()
    
    return groups

@router.post("/{group_id}/join")
async def join_group(
    group_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Join a group."""
    # Check if group exists
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if already a member
    existing_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this group"
        )
    
    # Add user to group
    db_member = models.GroupMember(
        group_id=group_id,
        user_id=current_user.id
    )
    
    db.add(db_member)
    db.commit()
    
    return {"message": "Successfully joined group"}

@router.post("/{group_id}/leave")
async def leave_group(
    group_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Leave a group."""
    member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of this group"
        )
    
    db.delete(member)
    db.commit()
    
    return {"message": "Successfully left group"}

@router.get("/{group_id}/messages", response_model=List[schemas.Message])
async def get_group_messages(
    group_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get messages from a group."""
    # Verify user is a member of the group
    member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    messages = db.query(models.Message).filter(
        models.Message.group_id == group_id
    ).order_by(models.Message.created_at.asc()).offset(skip).limit(limit).all()
    
    return messages

@router.get("/{group_id}/members", response_model=List[schemas.User])
async def get_group_members(
    group_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get members of a group."""
    # Verify user is a member of the group
    member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    members = db.query(models.User).join(models.GroupMember).filter(
        models.GroupMember.group_id == group_id
    ).all()
    
    return members

@router.get("/available", response_model=List[schemas.Group])
async def get_available_groups(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get groups available to join."""
    # Get groups user is not already a member of
    joined_group_ids = db.query(models.GroupMember.group_id).filter(
        models.GroupMember.user_id == current_user.id
    ).subquery()
    
    available_groups: List[models.Group] = db.query(models.Group).filter(
        models.Group.is_active == True,
        ~models.Group.id.in_(joined_group_ids)  # type: ignore
    ).all()
    
    return available_groups
