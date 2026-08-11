from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.database.session import get_db
from app.models.models import User, Account, Transaction
from app.schemas.schemas import TransferRequest, TransactionResponse
from app.auth.jwt import get_current_user
from app.services.banking_service import BankingService

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("/transfer", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def transfer_money(
    transfer_in: TransferRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ip_addr = request.client.host if request.client else "127.0.0.1"
    u_agent = request.headers.get("user-agent", "Unknown")
    return BankingService.transfer_funds(db, current_user, transfer_in, ip_address=ip_addr, user_agent=u_agent)

@router.get("/history", response_model=List[TransactionResponse])
def get_transaction_history(
    account_id: Optional[int] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve all user's account IDs
    user_account_ids = [acc.id for acc in db.query(Account).filter(Account.user_id == current_user.id).all()]
    if not user_account_ids:
        return []

    if account_id:
        if account_id not in user_account_ids:
            raise HTTPException(status_code=403, detail="Access denied to requested account")
        target_ids = [account_id]
    else:
        target_ids = user_account_ids

    transactions = db.query(Transaction).filter(
        or_(
            Transaction.source_account_id.in_(target_ids),
            Transaction.target_account_id.in_(target_ids)
        )
    ).order_by(desc(Transaction.created_at)).offset(offset).limit(limit).all()

    return transactions

@router.get("/search", response_model=List[TransactionResponse])
def search_transactions(
    q: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_account_ids = [acc.id for acc in db.query(Account).filter(Account.user_id == current_user.id).all()]
    if not user_account_ids:
        return []

    query = db.query(Transaction).filter(
        or_(
            Transaction.source_account_id.in_(user_account_ids),
            Transaction.target_account_id.in_(user_account_ids)
        )
    )

    if q:
        query = query.filter(
            or_(
                Transaction.transaction_ref.ilike(f"%{q}%"),
                Transaction.description.ilike(f"%{q}%")
            )
        )

    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)

    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)

    if start_date:
        try:
            s_dt = datetime.fromisoformat(start_date.replace("Z", ""))
            query = query.filter(Transaction.created_at >= s_dt)
        except ValueError:
            pass

    if end_date:
        try:
            e_dt = datetime.fromisoformat(end_date.replace("Z", ""))
            query = query.filter(Transaction.created_at <= e_dt)
        except ValueError:
            pass

    return query.order_by(desc(Transaction.created_at)).all()
