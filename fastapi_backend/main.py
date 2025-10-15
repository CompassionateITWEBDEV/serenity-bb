from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict
from uuid import uuid4

from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .models import Video

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()

# CORS configuration
origin = os.getenv("ORIGIN", "*")
allow_origins = [origin] if origin != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# In-memory metadata store
videos: List[Dict[str, object]] = []


@app.on_event("startup")
async def load_existing_videos() -> None:
    """Populate the in-memory list from existing files."""
    videos.clear()
    for file in UPLOAD_DIR.iterdir():
        if file.is_file():
            stat = file.stat()
            videos.append(
                {
                    "id": str(uuid4()),
                    "filename": file.name,
                    "size": stat.st_size,
                    "uploadedAt": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
                }
            )


def _build_video_response(request: Request, data: Dict[str, object]) -> Video:
    url = str(request.url_for("uploads", path=data["filename"]))
    return Video(
        id=data["id"],
        filename=data["filename"],
        url=url,
        size=data["size"],
        uploadedAt=data["uploadedAt"],
    )


@app.post("/videos/upload", response_model=Dict[str, Video])
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    # Basic auth validation
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    file_path = UPLOAD_DIR / file.filename
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except OSError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    video_data = {
        "id": str(uuid4()),
        "filename": file.filename,
        "size": len(contents),
        "uploadedAt": datetime.now(tz=timezone.utc),
    }
    videos.append(video_data)

    video = _build_video_response(request, video_data)
    return {"message": "ok", "video": video}


@app.get("/videos/", response_model=List[Video])
async def list_videos(request: Request) -> List[Video]:
    return [_build_video_response(request, v) for v in videos]
