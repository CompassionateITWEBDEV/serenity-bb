from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from database import get_db
import models
import schemas
from auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/send", response_model=schemas.Message)
async def send_message(
    message: schemas.MessageCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a message to another user or group."""
    # Validate that either recipient_id or group_id is provided
    if not message.recipient_id and not message.group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either recipient_id or group_id must be provided"
        )
    
    if message.recipient_id and message.group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send to both individual recipient and group"
        )
    
    # If sending to a group, verify user is a member
    if message.group_id:
        group_member = db.query(models.GroupMember).filter(
            and_(
                models.GroupMember.group_id == message.group_id,
                models.GroupMember.user_id == current_user.id
            )
        ).first()
        
        if not group_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
    
    # If sending to individual, verify recipient exists
    if message.recipient_id:
        recipient = db.query(models.User).filter(models.User.id == message.recipient_id).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient not found"
            )
    
    # Create message
    db_message = models.Message(
        sender_id=current_user.id,
        recipient_id=message.recipient_id,
        group_id=message.group_id,
        subject=message.subject,
        content=message.content,
        is_group_message=message.is_group_message or bool(message.group_id)
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return db_message

@router.get("/inbox", response_model=List[schemas.Message])
async def get_inbox(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's inbox messages."""
    messages = db.query(models.Message).filter(
        models.Message.recipient_id == current_user.id
    ).order_by(models.Message.created_at.desc()).offset(skip).limit(limit).all()
    
    return messages

@router.get("/sent", response_model=List[schemas.Message])
async def get_sent_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's sent messages."""
    messages = db.query(models.Message).filter(
        models.Message.sender_id == current_user.id
    ).order_by(models.Message.created_at.desc()).offset(skip).limit(limit).all()
    
    return messages

@router.get("/conversation/{user_id}", response_model=List[schemas.Message])
async def get_conversation(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get conversation between current user and another user."""
    messages = db.query(models.Message).filter(
        or_(
            and_(
                models.Message.sender_id == current_user.id,
                models.Message.recipient_id == user_id
            ),
            and_(
                models.Message.sender_id == user_id,
                models.Message.recipient_id == current_user.id
            )
        )
    ).order_by(models.Message.created_at.asc()).offset(skip).limit(limit).all()
    
    return messages

@router.put("/{message_id}/read")
async def mark_message_read(
    message_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a message as read."""
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Only recipient can mark message as read
    if message.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only mark your own messages as read"
        )
    
    message.status = models.MessageStatus.READ
    message.read_at = func.now()
    db.commit()
    
    return {"message": "Message marked as read"}

@router.get("/healthcare-providers", response_model=List[schemas.User])
async def get_healthcare_providers(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get list of healthcare providers for messaging."""
    if current_user.role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access healthcare provider list"
        )
    
    providers = db.query(models.User).filter(
        models.User.role.in_([
            models.UserRole.DOCTOR,
            models.UserRole.NURSE,
            models.UserRole.COUNSELOR
        ])
    ).filter(models.User.is_active == True).all()
    
    return providers
