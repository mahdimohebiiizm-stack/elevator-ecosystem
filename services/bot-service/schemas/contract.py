from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from db.models.contract import ContractStatus


class ContractUserResponse(BaseModel):
    id: uuid.UUID
    phone: Optional[str] = None
    name: Optional[str] = None
    role: str

    model_config = ConfigDict(from_attributes=True)


class ContractCreate(BaseModel):
    building_address: str = Field(..., min_length=3, description="Full building address")
    building_name: Optional[str] = Field(None, description="Building / complex name")
    postal_code: Optional[str] = Field(None, description="Building 10-digit postal code")
    registration_plate: Optional[str] = Field(None, description="Building registration / cadastre plate")
    employer_national_id: Optional[str] = Field(None, description="Building manager / employer national ID")
    manager_name: Optional[str] = Field(None, description="Building manager / employer official name")
    manager_phone: Optional[str] = Field(None, description="Building manager / employer contact phone")
    
    elevator_type: str = Field(..., min_length=2, max_length=100, description="Type of elevator")
    stops_count: int = Field(..., ge=1, le=100, description="Number of stops")
    capacity_kg: int = Field(default=600, ge=50, le=10000, description="Capacity in Kilograms")
    speed_ms: str = Field(default="1.0 m/s", min_length=1, max_length=50, description="Rated speed in m/s")
    usage_type: Optional[str] = Field(default="مسافری", description="Elevator usage type")
    payment_frequency: Optional[str] = Field(default="FLEXIBLE", description="Preferred payment cycle (MONTHLY, QUARTERLY, FLEXIBLE)")


class ContractAdminUpdate(BaseModel):
    building_name: Optional[str] = None
    postal_code: Optional[str] = None
    registration_plate: Optional[str] = None
    employer_national_id: Optional[str] = None
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    contract_number: Optional[str] = None
    elevator_type: Optional[str] = None
    stops_count: Optional[int] = None
    capacity_kg: Optional[int] = None
    speed_ms: Optional[str] = None
    usage_type: Optional[str] = None
    annual_price: Optional[float] = Field(None, ge=0, description="Annual maintenance price in Toman")
    monthly_fee: Optional[float] = Field(None, ge=0, description="Monthly maintenance fee")
    total_debt: Optional[float] = Field(None, description="Outstanding balance / debt")
    payment_frequency: Optional[str] = None
    tax_amount: Optional[float] = Field(None, ge=0, description="Applicable tax amount")
    start_date: Optional[datetime] = Field(None, description="Contract commencement date")
    end_date: Optional[datetime] = Field(None, description="Contract termination date")
    status: Optional[ContractStatus] = Field(None, description="Contract status")


class ContractResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    building_address: str
    building_name: Optional[str] = None
    postal_code: Optional[str] = None
    registration_plate: Optional[str] = None
    employer_national_id: Optional[str] = None
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    contract_number: Optional[str] = None
    elevator_type: str
    stops_count: int
    capacity_kg: int
    speed_ms: str
    usage_type: Optional[str] = "مسافری"
    qr_code_hash: Optional[str] = None
    annual_price: Optional[float] = None
    monthly_fee: Optional[float] = None
    total_debt: Optional[float] = None
    payment_frequency: Optional[str] = "FLEXIBLE"
    tax_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: ContractStatus
    core_building_id: Optional[uuid.UUID] = None
    core_elevator_id: Optional[uuid.UUID] = None
    core_contract_id: Optional[uuid.UUID] = None
    synced_at: Optional[datetime] = None
    sync_status: Optional[str] = "NOT_SYNCED"
    sync_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user: Optional[ContractUserResponse] = None

    model_config = ConfigDict(from_attributes=True)
