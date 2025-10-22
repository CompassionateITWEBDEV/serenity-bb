import os
import aiofiles
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_active_user, require_role
from config import settings

router = APIRouter()

@router.post("/upload", response_model=schemas.VideoRecording)
async def upload_video(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    video_file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a video recording."""
    # Type assertion to help the type checker understand the enum comparison
    user_role: models.UserRole = current_user.role  # type: ignore  # type: ignore
    if user_role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can upload videos"
        )
    
    # Get patient profile
    patient: Optional[models.Patient] = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    # Validate file type
    if not video_file.content_type or not video_file.content_type.startswith('video/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a video"
        )
    
    # Read content and check file size
    content = await video_file.read()
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum limit of {settings.max_file_size} bytes"
        )
    
    # Create upload directory if it doesn't exist
    upload_dir = os.path.join(settings.upload_dir, "videos", str(patient.id))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    import uuid
    file_extension = os.path.splitext(video_file.filename or "")[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Create database record
    db_video = models.VideoRecording(
        patient_id=patient.id,
        title=title,
        description=description,
        file_path=file_path,
        file_size_bytes=len(content)
    )
    
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    
    return db_video

@router.get("/my-videos", response_model=List[schemas.VideoRecording])
async def get_my_videos(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current patient's video recordings."""
    user_role: models.UserRole = current_user.role  # type: ignore
    if user_role != models.UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access their videos"
        )
    
    patient: Optional[models.Patient] = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
    if not patient:
        return []
    
    videos: List[models.VideoRecording] = db.query(models.VideoRecording).filter(
        models.VideoRecording.patient_id == patient.id
    ).order_by(models.VideoRecording.recorded_at.desc()).all()
    
    return videos

@router.get("/{video_id}/download")
async def download_video(
    video_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download a video recording."""
    video: Optional[models.VideoRecording] = db.query(models.VideoRecording).filter(models.VideoRecording.id == video_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    # Check permissions
    user_role: models.UserRole = current_user.role  # type: ignore
    if user_role == models.UserRole.PATIENT:
        patient: Optional[models.Patient] = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
        patient_id: int = video.patient_id  # type: ignore
        if not patient or patient_id != patient.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this video"
            )
    
    # Get the actual file path value
    file_path: str = video.file_path  # type: ignore
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video file not found on server"
        )
    
    return FileResponse(
        path=file_path,
        filename=f"{video.title}.mp4",
        media_type='video/mp4'
    )

@router.delete("/{video_id}")
async def delete_video(
    video_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a video recording."""
    video: Optional[models.VideoRecording] = db.query(models.VideoRecording).filter(models.VideoRecording.id == video_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    # Check permissions
    user_role: models.UserRole = current_user.role  # type: ignore
    if user_role == models.UserRole.PATIENT:
        patient: Optional[models.Patient] = db.query(models.Patient).filter(models.Patient.user_id == current_user.id).first()
        patient_id: int = video.patient_id  # type: ignore
        if not patient or patient_id != patient.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this video"
            )
    
    # Delete file from filesystem
    file_path: str = video.file_path  # type: ignore
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete database record
    db.delete(video)
    db.commit()
    
    return {"message": "Video deleted successfully"}
