from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON, UniqueConstraint, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class RewardWallet(Base):
__tablename__ = "reward_wallets"
patient_id = Column(Integer, ForeignKey("patients.id"), primary_key=True)
balance = Column(Integer, nullable=False, default=0)
created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class TokenTransfer(Base):
__tablename__ = "reward_token_transfers"
id = Column(Integer, primary_key=True, index=True)
wallet_patient_id = Column(Integer, ForeignKey("reward_wallets.patient_id"), nullable=False, index=True)
type = Column(String, nullable=False) # credit|debit
amount = Column(Integer, nullable=False)
source = Column(String, nullable=False) # TASK|WEBHOOK|MANUAL|REDEMPTION|SPIN|AIRDROP
memo = Column(Text)
external_ref = Column(String, unique=True) # for idempotency
created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Task(Base):
__tablename__ = "reward_tasks"
task_code = Column(String, primary_key=True)
title = Column(String, nullable=False)
description = Column(Text)
reward = Column(Integer, nullable=False)
max_per_day = Column(Integer, nullable=False, default=1)
active = Column(Boolean, nullable=False, default=True)
created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class TaskCompletion(Base):
__tablename__ = "reward_task_completions"
id = Column(Integer, primary_key=True, index=True)
patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
task_code = Column(String, ForeignKey("reward_tasks.task_code"), nullable=False)
meta = Column(JSON)
created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
__table_args__ = (
# speed up per-day lookups
UniqueConstraint('id', name='reward_task_completions_pk'),
)


class PublicAlias(Base):
__tablename__ = "reward_public_aliases"
patient_id = Column(Integer, ForeignKey("patients.id"), primary_key=True)
anon_tag = Column(String, unique=True, nullable=False)


# Optional prize wheel
class Prize(Base):
__tablename__ = "reward_prizes"
id = Column(Integer, primary_key=True)
label = Column(String, nullable=False)
token = Column(Integer) # nullable → non-token prize supported later
weight = Column(Integer, nullable=False)
inventory = Column(Integer) # NULL/None means unlimited
active = Column(Boolean, nullable=False, default=True)
created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Spin(Base):
__tablename__ = "reward_spins"
id = Column(Integer, primary_key=True)
patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
prize_id = Column(Integer, ForeignKey("reward_prizes.id"), nullable=False)
created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# Optional games
class Game(Base):
__tablename__ = "reward_games"
game_code = Column(String, primary_key=True)
title = Column(String, nullable=False)
kind = Column(String, nullable=False) # trivia|reaction|puzzle|wheel|other
created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
