from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class Video(BaseModel):
    """Metadata returned for each uploaded video."""

    id: str
    filename: str
    url: str
    size: int
    uploadedAt: datetime
