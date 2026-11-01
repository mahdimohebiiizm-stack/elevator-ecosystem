# modules/building/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from core.database import get_db
from core.security import get_current_user, get_manager_user, get_admin_user
from modules.auth.models import User
from . import schemas, models

router = APIRouter()

# ثبت ساختمان: تکنسین نباید بتواند ساختمان جدید ثبت کند (فقط مدیر و ادمین)
@router.post("/", response_model=schemas.BuildingResponse, status_code=status.HTTP_201_CREATED)
def create_building(
    building: schemas.BuildingCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_user)
):
    new_building = models.Building(**building.dict())
    db.add(new_building)
    db.commit()
    db.refresh(new_building)
    return new_building

# دیدن لیست ساختمان‌ها: همه (حتی تکنسین) نیاز دارند ببینند تا انتخاب کنند
@router.get("/", response_model=List[schemas.BuildingResponse])
def get_all_buildings(
    skip: int = 0, limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    buildings = db.query(models.Building).filter(models.Building.is_deleted == False).offset(skip).limit(limit).all()
    return buildings

# ویرایش ساختمان: فقط مدیر و ادمین
@router.put("/{building_id}", response_model=schemas.BuildingResponse)
def update_building(
    building_id: UUID, 
    building_data: schemas.BuildingUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_user)
):
    building = db.query(models.Building).filter(models.Building.id == building_id, models.Building.is_deleted == False).first()
    if not building:
        raise HTTPException(status_code=404, detail="ساختمان مورد نظر یافت نشد")
    
    update_data = building_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(building, key, value)
        
    db.commit()
    db.refresh(building)
    return building

# حذف ساختمان: عملیات حساس، فقط ادمین کل!
@router.delete("/{building_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_building(
    building_id: UUID, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    building = db.query(models.Building).filter(models.Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="ساختمان مورد نظر یافت نشد")
    
    building.is_deleted = True
    db.commit()
    return None

# ثبت آسانسور: فقط مدیر و ادمین
@router.post("/{building_id}/elevators", response_model=schemas.ElevatorResponse, status_code=status.HTTP_201_CREATED)
def add_elevator_to_building(
    building_id: UUID, 
    elevator: schemas.ElevatorCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_user)
):
    db_building = db.query(models.Building).filter(models.Building.id == building_id).first()
    if not db_building:
        raise HTTPException(status_code=404, detail="ساختمان مورد نظر یافت نشد")
    
    new_elevator = models.Elevator(building_id=building_id, **elevator.dict())
    db.add(new_elevator)
    db.commit()
    db.refresh(new_elevator)
    return new_elevator

# حذف آسانسور: فقط ادمین کل
@router.delete("/elevators/{elevator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_elevator(
    elevator_id: UUID, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    elevator = db.query(models.Elevator).filter(models.Elevator.id == elevator_id).first()
    if not elevator:
        raise HTTPException(status_code=404, detail="آسانسور مورد نظر یافت نشد")
    
    db.delete(elevator)
    db.commit()
    return None