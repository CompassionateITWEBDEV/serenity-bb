from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Wallet(BaseModel):
patient_id: int
balance: int
updated_at: datetime
class Config:
orm_mode = True


class LedgerEntry(BaseModel):
id: int
type: str
amount: int
source: str
memo: Optional[str]
external_ref: Optional[str]
created_at: datetime
class Config:
orm_mode = True


class TaskPublic(BaseModel):
task_code: str
title: str
description: Optional[str]
reward: int
max_per_day: int
active: bool
class Config:
orm_mode = True


class CompleteTaskRequest(BaseModel):
task_code: str = Field(..., min_length=2)
meta: Optional[dict] = None


class RedemptionRequest(BaseModel):
amount: int = Field(..., gt=0)
memo: Optional[str] = None


class SpinResponse(BaseModel):
ok: bool
label: str
token: int


class GameStartResponse(BaseModel):
session_id: int


class GameEndRequest(BaseModel):
session_id: int
score: int
outcome: str


class GameStatus(BaseModel):
exists: bool
active: bool
earned_today: int
max_reward_per_day: int
remaining_today: int
cooldown_seconds: int
next_available_at: Optional[datetime]
can_play_now: bool
