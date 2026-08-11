from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import User, Account, Transaction, AuditLog
from app.schemas.schemas import AccountResponse, UserResponse, AuditLogResponse, MessageResponse
from app.auth.jwt import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

def check_admin(user: User):
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )

class StatusUpdate(BaseModel):
    status: str

class UserStatusUpdate(BaseModel):
    is_active: bool

@router.get("/stats")
def get_admin_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_admin(current_user)

    total_deposits = db.query(func.sum(Account.balance)).scalar() or 0.0
    total_customers = db.query(User).filter(User.role == "CUSTOMER").count()
    total_accounts = db.query(Account).count()
    active_accounts = db.query(Account).filter(Account.status == "ACTIVE").count()
    frozen_accounts = db.query(Account).filter(Account.status == "FROZEN").count()
    total_transactions = db.query(Transaction).count()

    return {
        "total_deposits": round(total_deposits, 2),
        "total_customers": total_customers,
        "total_accounts": total_accounts,
        "active_accounts": active_accounts,
        "frozen_accounts": frozen_accounts,
        "total_transactions": total_transactions
    }

@router.get("/accounts")
def get_all_bank_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_admin(current_user)

    accounts = db.query(Account).join(User).all()
    result = []
    for acc in accounts:
        result.append({
            "id": acc.id,
            "account_number": acc.account_number,
            "account_type": acc.account_type,
            "balance": acc.balance,
            "currency": acc.currency,
            "ifsc_code": acc.ifsc_code,
            "branch_name": acc.branch_name,
            "status": acc.status,
            "created_at": acc.created_at,
            "owner": {
                "id": acc.owner.id,
                "username": acc.owner.username,
                "full_name": acc.owner.full_name,
                "email": acc.owner.email,
                "is_active": acc.owner.is_active
            }
        })
    return result

@router.put("/accounts/{account_id}/status", response_model=MessageResponse)
def update_account_status(
    account_id: int,
    status_in: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)

    valid_statuses = ["ACTIVE", "FROZEN", "CLOSED", "PENDING_APPROVAL"]
    if status_in.status.upper() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    acc = db.query(Account).filter(Account.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    old_status = acc.status
    acc.status = status_in.status.upper()

    audit = AuditLog(
        user_id=current_user.id,
        action="ADMIN_ACCOUNT_STATUS_CHANGE",
        details=f"Admin changed account {acc.account_number} status from {old_status} to {acc.status}"
    )
    db.add(audit)
    db.commit()

    return MessageResponse(message=f"Account {acc.account_number} status updated to {acc.status}")

@router.get("/users")
def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_admin(current_user)

    users = db.query(User).all()
    result = []
    for u in users:
        acc_count = db.query(Account).filter(Account.user_id == u.id).count()
        result.append({
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "is_active": u.is_active,
            "accounts_count": acc_count,
            "created_at": u.created_at
        })
    return result

@router.put("/users/{user_id}/status", response_model=MessageResponse)
def update_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.is_active = status_in.is_active

    audit = AuditLog(
        user_id=current_user.id,
        action="ADMIN_USER_STATUS_CHANGE",
        details=f"Admin set user {target_user.username} is_active to {target_user.is_active}"
    )
    db.add(audit)
    db.commit()

    return MessageResponse(message=f"User {target_user.username} active status set to {target_user.is_active}")

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_all_audit_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_admin(current_user)

    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return logs
