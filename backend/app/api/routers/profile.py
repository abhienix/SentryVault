from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, AuditLog
from app.schemas.schemas import UserResponse, UserUpdate, ChangePassword, AuditLogResponse, MessageResponse
from app.auth.jwt import get_current_user
from app.core.security import verify_password, get_password_hash

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("/", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/", response_model=UserResponse)
def update_profile(
    p_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if p_in.full_name is not None:
        current_user.full_name = p_in.full_name
    if p_in.phone is not None:
        current_user.phone = p_in.phone
    if p_in.email is not None:
        # Check uniqueness
        dup = db.query(User).filter(User.email == p_in.email, User.id != current_user.id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Email is already used by another user")
        current_user.email = p_in.email

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    pwd_in: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(pwd_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if pwd_in.current_password == pwd_in.new_password:
        raise HTTPException(status_code=400, detail="New password cannot be identical to current password")

    current_user.hashed_password = get_password_hash(pwd_in.new_password)

    audit = AuditLog(
        user_id=current_user.id,
        action="PASSWORD_CHANGED",
        details="User updated account password"
    )
    db.add(audit)
    db.commit()

    return MessageResponse(message="Password updated successfully")

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_user_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).filter(AuditLog.user_id == current_user.id).order_by(AuditLog.created_at.desc()).limit(50).all()
    return logs
