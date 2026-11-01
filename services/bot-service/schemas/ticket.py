from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from db.models.ticket import TicketPriority, TicketStatus


class TicketSenderResponse(BaseModel):
    id: uuid.UUID
    phone: Optional[str] = None
    role: str

    model_config = ConfigDict(from_attributes=True)


class TicketUserResponse(BaseModel):
    id: uuid.UUID
    phone: Optional[str] = None
    role: str

    model_config = ConfigDict(from_attributes=True)


class TicketMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, description="Ticket message text content")


class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=2, max_length=255, description="Ticket subject line")
    content: str = Field(..., min_length=1, description="Initial ticket inquiry message")
    priority: Optional[TicketPriority] = Field(
        default=TicketPriority.MEDIUM,
        description="Ticket priority level (LOW, MEDIUM, HIGH, CRITICAL)",
    )


class TicketMessageResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    is_from_admin: bool
    created_at: datetime
    sender: Optional[TicketSenderResponse] = None

    model_config = ConfigDict(from_attributes=True)


class TicketResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    subject: str
    status: TicketStatus
    priority: TicketPriority
    created_at: datetime
    updated_at: datetime
    user: Optional[TicketUserResponse] = None
    messages: List[TicketMessageResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TicketStatusUpdateRequest(BaseModel):
    status: TicketStatus = Field(..., description="Target ticket status")
