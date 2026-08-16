import uuid
from datetime import datetime, timezone

from app.models.models import (
    User, Account, Transaction, Notification, AuditLog,
    AccountStatusEnum, TransactionTypeEnum, TransactionStatusEnum, NotificationTypeEnum
)
from app.schemas.schemas import TransferRequest

class BankingService:

    @staticmethod
    def transfer_funds(db: Session, sender_user: User, transfer_data: TransferRequest, ip_address: str = "127.0.0.1", user_agent: str = "Unknown") -> Transaction:
        # 1. Fetch source account and verify ownership
        source_acc = db.query(Account).filter(Account.account_number == transfer_data.source_account_number).first()
        if not source_acc:
            raise HTTPException(status_code=404, detail="Source account not found")

        if source_acc.user_id != sender_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized access to source account")

        if source_acc.status != AccountStatusEnum.ACTIVE.value:
            raise HTTPException(status_code=400, detail="Source account is not active")

        # 2. Check sufficient balance
        if source_acc.balance < transfer_data.amount:
            raise HTTPException(status_code=400, detail="Insufficient account balance")

        # 3. Fetch target account
        target_acc = db.query(Account).filter(Account.account_number == transfer_data.target_account_number).first()
        if not target_acc:
            raise HTTPException(status_code=404, detail="Target beneficiary account not found")

        if source_acc.id == target_acc.id:
            raise HTTPException(status_code=400, detail="Cannot transfer funds to the same account")

        if target_acc.status != AccountStatusEnum.ACTIVE.value:
            raise HTTPException(status_code=400, detail="Target account is not active")

        # 4. Atomic transaction update
        try:
            source_acc.balance -= transfer_data.amount
            target_acc.balance += transfer_data.amount

            tx_ref = f"TXN-{uuid.uuid4().hex[:12].upper()}"
            transaction = Transaction(
                transaction_ref=tx_ref,
                source_account_id=source_acc.id,
                target_account_id=target_acc.id,
                amount=transfer_data.amount,
                transaction_type=TransactionTypeEnum.TRANSFER.value,
                description=transfer_data.description or "Fund Transfer",
                status=TransactionStatusEnum.COMPLETED.value,
                created_at=datetime.now(timezone.utc)
            )
            db.add(transaction)

            # Notifications
            notify_sender = Notification(
                user_id=sender_user.id,
                title="Fund Transfer Sent",
                message=f"Transferred ₹{transfer_data.amount:,.2f} from {source_acc.account_number} to {target_acc.account_number}. Ref: {tx_ref}",
                type=NotificationTypeEnum.TRANSACTION.value
            )
            db.add(notify_sender)

            notify_recipient = Notification(
                user_id=target_acc.user_id,
                title="Fund Transfer Received",
                message=f"Received ₹{transfer_data.amount:,.2f} in account {target_acc.account_number}. Ref: {tx_ref}",
                type=NotificationTypeEnum.TRANSACTION.value
            )
            db.add(notify_recipient)

            # Audit log
            audit = AuditLog(
                user_id=sender_user.id,
                action="TRANSFER_FUNDS",
                ip_address=ip_address,
                user_agent=user_agent,
                details=f"Transferred ₹{transfer_data.amount} from {source_acc.account_number} to {target_acc.account_number}"
            )
            db.add(audit)

            db.commit()
            db.refresh(transaction)
            return transaction
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Transaction processing failed: {str(e)}")
