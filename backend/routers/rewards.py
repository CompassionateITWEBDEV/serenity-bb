from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional


from database import get_db
import models
from models_rewards import RewardWallet, TokenTransfer, Task, TaskCompletion, Prize, Spin, Game, GameSession
import schemas_rewards as rschemas
from auth import get_current_active_user, require_role


router = APIRouter(prefix="/api/rewards", tags=["rewards"])


# ---- helpers ---------------------------------------------------------------


def ensure_wallet(db: Session, patient_id: int) -> RewardWallet:
wallet = db.query(RewardWallet).filter(RewardWallet.patient_id == patient_id).first()
if not wallet:
wallet = RewardWallet(patient_id=patient_id, balance=0)
db.add(wallet)
db.commit()
db.refresh(wallet)
return wallet




def credit(db: Session, patient_id: int, amount: int, source: str, memo: Optional[str] = None, external_ref: Optional[str] = None) -> TokenTransfer:
if amount <= 0:
raise HTTPException(status_code=400, detail="amount_must_be_positive")
if external_ref:
existing = db.query(TokenTransfer).filter(TokenTransfer.external_ref == external_ref).first()
if existing:
return existing
wallet = ensure_wallet(db, patient_id)
tx = TokenTransfer(wallet_patient_id=patient_id, type="credit", amount=amount, source=source, memo=memo, external_ref=external_ref)
wallet.balance += amount
db.add(tx)
db.add(wallet)
db.commit()
db.refresh(tx)
return tx




def debit(db: Session, patient_id: int, amount: int, source: str = "REDEMPTION", memo: Optional[str] = None) -> TokenTransfer:
if amount <= 0:
raise HTTPException(status_code=400, detail="amount_must_be_positive")
wallet = ensure_wallet(db, patient_id)
if wallet.balance < amount:
raise HTTPException(status_code=400, detail="insufficient_balance")
tx = TokenTransfer(wallet_patient_id=patient_id, type="debit", amount=amount, source=source, memo=memo)
wallet.balance -= amount
db.add(tx)
db.add(wallet)
db.commit()
db.refresh(tx)
return tx
