from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
import models
import schemas
from auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/tokens", response_model=schemas.RewardToken)
async def get_patient_tokens(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current patient's reward tokens."""
    if current_user.role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access reward tokens"
        )
    
    patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    # Get or create reward tokens record
    reward_tokens = db.query(models.RewardToken).filter(models.RewardToken.patient_id == patient.id).first()
    if not reward_tokens:
        reward_tokens = models.RewardToken(patient_id=patient.id)
        db.add(reward_tokens)
        db.commit()
        db.refresh(reward_tokens)
    
    return reward_tokens

@router.post("/award-tokens", response_model=schemas.TokenAwardResponse)
async def award_tokens_to_patient(
    patient_id: int,
    amount: int,
    reason: str,
    source_type: str,
    source_id: Optional[int] = None,
    description: Optional[str] = None,
    current_user: models.User = Depends(require_role([models.UserRole.DOCTOR, models.UserRole.NURSE, models.UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Award tokens to a patient (staff only)."""
    # Use the database function to award tokens
    try:
        db.execute(
            text("SELECT award_tokens(:patient_id, :amount, :reason, :source_type, :source_id, :description)"),
            {
                "patient_id": patient_id,
                "amount": amount,
                "reason": reason,
                "source_type": source_type,
                "source_id": source_id,
                "description": description
            }
        )
        db.commit()
        
        # Get updated token info
        reward_tokens = db.query(models.RewardToken).filter(models.RewardToken.patient_id == patient_id).first()
        
        # Check if level increased
        previous_level = (reward_tokens.total_tokens - amount) // 100 + 1
        current_level = reward_tokens.level
        level_up = current_level > previous_level
        
        return schemas.TokenAwardResponse(
            tokens_awarded=amount,
            new_total=reward_tokens.total_tokens - reward_tokens.tokens_spent,
            level=current_level,
            level_up=level_up,
            message=f"Earned {amount} tokens for {reason}!"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to award tokens: {str(e)}"
        )

@router.get("/transactions", response_model=List[schemas.TokenTransaction])
async def get_token_transactions(
    limit: int = 50,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get patient's token transaction history."""
    if current_user.role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access their transactions"
        )
    
    patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        return []
    
    transactions = db.query(models.TokenTransaction).filter(
        models.TokenTransaction.patient_id == patient.id
    ).order_by(models.TokenTransaction.created_at.desc()).limit(limit).all()
    
    return transactions

@router.get("/rewards-catalog", response_model=List[schemas.RewardsCatalog])
async def get_rewards_catalog(
    category: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get available rewards catalog."""
    query = db.query(models.RewardsCatalog).filter(models.RewardsCatalog.is_active == True)
    
    if category:
        query = query.filter(models.RewardsCatalog.category == category)
    
    rewards = query.order_by(models.RewardsCatalog.cost_tokens).all()
    return rewards

@router.post("/redeem-reward", response_model=schemas.PatientReward)
async def redeem_reward(
    reward_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Redeem a reward using tokens."""
    if current_user.role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can redeem rewards"
        )
    
    patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    # Get reward details
    reward = db.query(models.RewardsCatalog).filter(
        models.RewardsCatalog.id == reward_id,
        models.RewardsCatalog.is_active == True
    ).first()
    
    if not reward:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reward not found or not available"
        )
    
    # Check if patient has enough tokens
    reward_tokens = db.query(models.RewardToken).filter(models.RewardToken.patient_id == patient.id).first()
    if not reward_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tokens available"
        )
    
    available_tokens = reward_tokens.total_tokens - reward_tokens.tokens_spent
    if available_tokens < reward.cost_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient tokens. Need {reward.cost_tokens}, have {available_tokens}"
        )
    
    # Use database function to spend tokens
    try:
        result = db.execute(
            text("SELECT spend_tokens(:patient_id, :amount, :reason, :reward_id)"),
            {
                "patient_id": patient.id,
                "amount": reward.cost_tokens,
                "reason": f"Redeemed {reward.name}",
                "reward_id": reward_id
            }
        ).scalar()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to spend tokens"
            )
        
        # Create patient reward record
        patient_reward = models.PatientReward(
            patient_id=patient.id,
            reward_id=reward_id,
            tokens_spent=reward.cost_tokens
        )
        
        db.add(patient_reward)
        db.commit()
        db.refresh(patient_reward)
        
        return patient_reward
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to redeem reward: {str(e)}"
        )

@router.get("/my-rewards", response_model=List[schemas.PatientReward])
async def get_my_rewards(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get patient's redeemed rewards."""
    if current_user.role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access their rewards"
        )
    
    patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        return []
    
    rewards = db.query(models.PatientReward).filter(
        models.PatientReward.patient_id == patient.id
    ).order_by(models.PatientReward.redeemed_at.desc()).all()
    
    return rewards

@router.get("/progress", response_model=schemas.PatientProgress)
async def get_patient_progress(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive patient progress including tokens, transactions, and rewards."""
    if current_user.role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access their progress"
        )
    
    patient = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    # Get or create reward tokens
    reward_tokens = db.query(models.RewardToken).filter(models.RewardToken.patient_id == patient.id).first()
    if not reward_tokens:
        reward_tokens = models.RewardToken(patient_id=patient.id)
        db.add(reward_tokens)
        db.commit()
        db.refresh(reward_tokens)
    
    # Get recent transactions
    recent_transactions = db.query(models.TokenTransaction).filter(
        models.TokenTransaction.patient_id == patient.id
    ).order_by(models.TokenTransaction.created_at.desc()).limit(10).all()
    
    # Get available rewards (that patient can afford)
    available_tokens = reward_tokens.total_tokens - reward_tokens.tokens_spent
    available_rewards = db.query(models.RewardsCatalog).filter(
        models.RewardsCatalog.is_active == True,
        models.RewardsCatalog.cost_tokens <= available_tokens
    ).order_by(models.RewardsCatalog.cost_tokens).all()
    
    # Get redeemed rewards
    redeemed_rewards = db.query(models.PatientReward).filter(
        models.PatientReward.patient_id == patient.id
    ).order_by(models.PatientReward.redeemed_at.desc()).limit(5).all()
    
    return schemas.PatientProgress(
        patient_id=patient.id,
        tokens=reward_tokens,
        recent_transactions=recent_transactions,
        available_rewards=available_rewards,
        redeemed_rewards=redeemed_rewards
    )

# Helper function to automatically award tokens for appointments
async def award_appointment_tokens(appointment_id: int, db: Session):
    """Award tokens when appointment is completed."""
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment or appointment.status != models.AppointmentStatus.COMPLETED:
        return
    
    # Award different amounts based on appointment type
    token_amounts = {
        "therapy": 20,
        "group_session": 15,
        "medical": 10,
        "consultation": 10,
        "assessment": 25
    }
    
    amount = token_amounts.get(appointment.appointment_type, 10)
    
    try:
        db.execute(
            text("SELECT award_tokens(:patient_id, :amount, :reason, :source_type, :source_id, :description)"),
            {
                "patient_id": appointment.patient_id,
                "amount": amount,
                "reason": f"Completed {appointment.appointment_type} appointment",
                "source_type": "appointment",
                "source_id": appointment_id,
                "description": f"Attended {appointment.appointment_type} session"
            }
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to award appointment tokens: {e}")

# Helper function to automatically award tokens for video uploads
async def award_video_tokens(video_id: int, db: Session):
    """Award tokens when video is uploaded."""
    video = db.query(models.VideoRecording).filter(models.VideoRecording.id == video_id).first()
    if not video:
        return
    
    # Award tokens based on video type/title
    amount = 15  # Base amount for video submission
    
    try:
        db.execute(
            text("SELECT award_tokens(:patient_id, :amount, :reason, :source_type, :source_id, :description)"),
            {
                "patient_id": video.patient_id,
                "amount": amount,
                "reason": "Video submission",
                "source_type": "video_upload",
                "source_id": video_id,
                "description": f"Submitted video: {video.title or 'Untitled'}"
            }
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to award video tokens: {e}")
