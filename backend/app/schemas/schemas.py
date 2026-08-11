from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)

class UserResponse(UserBase):
    id: int
    is_active: bool
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# Account Schemas
class AccountResponse(BaseModel):
    id: int
    user_id: int
    account_number: str
    account_type: str
    balance: float
    currency: str
    ifsc_code: str
    branch_name: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Transaction Schemas
class TransferRequest(BaseModel):
    source_account_number: str
    target_account_number: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = "Fund Transfer"

class TransactionResponse(BaseModel):
    id: int
    transaction_ref: str
    source_account_id: Optional[int]
    target_account_id: Optional[int]
    amount: float
    transaction_type: str
    description: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TransactionFilter(BaseModel):
    search: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    account_id: Optional[int] = None

# Beneficiary Schemas
class BeneficiaryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    account_number: str = Field(..., min_length=8, max_length=20)
    bank_name: str = "SecureBank"
    ifsc_code: str = "SBIN0001234"
    nickname: Optional[str] = None

class BeneficiaryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    account_number: str
    bank_name: str
    ifsc_code: str
    nickname: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    type: str
    created_at: datetime

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    action: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Standard API Message Response
class MessageResponse(BaseModel):
    message: str
    success: bool = True
