from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class WebhookPayload(BaseModel):
    """
    Standardized messenger webhook payload schema.
    Compatible with Telegram, Bale, Rubika, and generic webhook event deliveries.
    """

    update_id: int = Field(
        ..., description="Unique update identifier from the messaging gateway"
    )
    message: Optional[Dict[str, Any]] = Field(
        None, description="Incoming user message entity"
    )
    callback_query: Optional[Dict[str, Any]] = Field(
        None, description="Inline button callback query"
    )
    event_type: Optional[str] = Field(
        "message", description="Descriptor for the event type"
    )


class WebhookResponse(BaseModel):
    """
    Standardized presentation response for webhook ingestion endpoints.
    """

    status: str = Field("ok", description="Processing execution status")
    update_id: int = Field(..., description="The update_id handled")
    processed: bool = Field(
        ...,
        description="True if newly processed; False if acknowledged as idempotent duplicate",
    )
    message: Optional[str] = Field(None, description="Informational message or reason")
