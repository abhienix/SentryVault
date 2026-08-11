from datetime import datetime
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    CUSTOMER = "CUSTOMER"

class AccountTypeEnum(str, enum.Enum):
    SAVINGS = "SAVINGS"
    CURRENT = "CURRENT"

class AccountStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    FROZEN = "FROZEN"
    CLOSED = "CLOSED"

class TransactionTypeEnum(str, enum.Enum):
    TRANSFER = "TRANSFER"
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"

class TransactionStatusEnum(str, enum.Enum):
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PENDING = "PENDING"

class NotificationTypeEnum(str, enum.Enum):
    INFO = "INFO"
    SECURITY = "SECURITY"
    TRANSACTION = "TRANSACTION"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(String(20), default=RoleEnum.CUSTOMER.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    accounts = relationship("Account", back_populates="owner", cascade="all, delete-orphan")
    beneficiaries = relationship("Beneficiary", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_number = Column(String(20), unique=True, index=True, nullable=False)
    account_type = Column(String(20), default=AccountTypeEnum.SAVINGS.value, nullable=False)
    balance = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    ifsc_code = Column(String(20), default="SBIN0001234", nullable=False)
    branch_name = Column(String(100), default="Main Metro Branch", nullable=False)
    status = Column(String(20), default=AccountStatusEnum.ACTIVE.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="accounts")
    outgoing_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.source_account_id",
        back_populates="source_account",
        cascade="all, delete-orphan"
    )
    incoming_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.target_account_id",
        back_populates="target_account",
        cascade="all, delete-orphan"
    )

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_ref = Column(String(36), unique=True, index=True, nullable=False)
    source_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    target_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(20), default=TransactionTypeEnum.TRANSFER.value, nullable=False)
    description = Column(String(255), nullable=True)
    status = Column(String(20), default=TransactionStatusEnum.COMPLETED.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    source_account = relationship("Account", foreign_keys=[source_account_id], back_populates="outgoing_transactions")
    target_account = relationship("Account", foreign_keys=[target_account_id], back_populates="incoming_transactions")

    __table_args__ = (
        Index("idx_transaction_search", "created_at", "amount"),
    )

class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    account_number = Column(String(20), nullable=False)
    bank_name = Column(String(100), default="SecureBank", nullable=False)
    ifsc_code = Column(String(20), default="SBIN0001234", nullable=False)
    nickname = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="beneficiaries")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    type = Column(String(20), default=NotificationTypeEnum.INFO.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="audit_logs")
