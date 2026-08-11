from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, Beneficiary
from app.schemas.schemas import BeneficiaryCreate, BeneficiaryResponse, MessageResponse
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/beneficiaries", tags=["Beneficiaries"])

@router.get("/", response_model=List[BeneficiaryResponse])
def get_beneficiaries(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Beneficiary).filter(Beneficiary.user_id == current_user.id).all()

@router.post("/", response_model=BeneficiaryResponse, status_code=status.HTTP_201_CREATED)
def add_beneficiary(
    b_in: BeneficiaryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check duplicate beneficiary
    existing = db.query(Beneficiary).filter(
        Beneficiary.user_id == current_user.id,
        Beneficiary.account_number == b_in.account_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Beneficiary account already added")

    new_b = Beneficiary(
        user_id=current_user.id,
        name=b_in.name,
        account_number=b_in.account_number,
        bank_name=b_in.bank_name,
        ifsc_code=b_in.ifsc_code,
        nickname=b_in.nickname
    )
    db.add(new_b)
    db.commit()
    db.refresh(new_b)
    return new_b

@router.delete("/{beneficiary_id}", response_model=MessageResponse)
def delete_beneficiary(
    beneficiary_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    b = db.query(Beneficiary).filter(
        Beneficiary.id == beneficiary_id,
        Beneficiary.user_id == current_user.id
    ).first()
    if not b:
        raise HTTPException(status_code=404, detail="Beneficiary not found")

    db.delete(b)
    db.commit()
    return MessageResponse(message="Beneficiary deleted successfully")
