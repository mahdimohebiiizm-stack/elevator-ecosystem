# modules/contract/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_manager_user, get_admin_user
from modules.auth.models import User
from . import schemas, models

router = APIRouter()

@router.post("/", response_model=schemas.ContractResponse, status_code=status.HTTP_201_CREATED)
def create_contract(
    contract_data: schemas.ContractCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_user)
):
    new_contract = models.Contract(**contract_data.model_dump())
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    return new_contract

# === این همان مسیری است که فلاتر برای فرم پرداختی به آن نیاز داشت ===
@router.get("/", response_model=list[schemas.ContractResponse])
def get_all_contracts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_user)
):
    """دریافت لیست تمام قراردادها (مورد نیاز برای تب مالی)"""
    contracts = db.query(models.Contract).order_by(models.Contract.created_at.desc()).all()
    return contracts

@router.get("/building/{building_id}", response_model=list[schemas.ContractResponse])
def get_building_contracts(
    building_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_user)
):
    contracts = db.query(models.Contract).filter(models.Contract.building_id == building_id).all()
    return contracts

@router.put("/{contract_id}", response_model=schemas.ContractResponse)
def update_contract(
    contract_id: str,
    contract_data: schemas.ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_user)
):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="قرارداد مورد نظر یافت نشد")
    
    update_data = contract_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contract, key, value)
        
    db.commit()
    db.refresh(contract)
    return contract

@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="قرارداد مورد نظر یافت نشد")
    
    db.delete(contract)
    db.commit()
    return None