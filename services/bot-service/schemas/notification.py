from datetime import datetime
from typing import List
import uuid
from pydantic import BaseModel, ConfigDict, Field


class NotificationResponse(BaseModel):
    """
    Presentation DTO for a user notification.
    """

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    """
    Summary payload for user notifications with unread count.
    """

    items: List[NotificationResponse] = Field(default_factory=list)
    unread_count: int = 0
