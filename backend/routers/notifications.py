from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from sqlalchemy.orm import Session
from database import get_db
import schemas
import models

router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, notification: schemas.Notification) -> None:
        data = notification.model_dump()
        for connection in self.active_connections:
            await connection.send_json(data)


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("", response_model=List[schemas.Notification])
async def get_notifications(db: Session = Depends(get_db)) -> List[models.Notification]:
    return db.query(models.Notification).order_by(models.Notification.created_at.desc()).all()


@router.post("", response_model=schemas.Notification, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification: schemas.NotificationCreate,
    db: Session = Depends(get_db),
) -> models.Notification:
    db_notification = models.Notification(**notification.model_dump())
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)

    await manager.broadcast(schemas.Notification.model_validate(db_notification))
    return db_notification
