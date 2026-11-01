from typing import Iterable, List, Optional
from google.protobuf.message import Message


class VoiceRequest(Message):
    audio_content: bytes
    mime_type: str
    language_code: str

    def __init__(
        self,
        audio_content: bytes = ...,
        mime_type: str = ...,
        language_code: str = ...,
    ) -> None: ...


class TextRequest(Message):
    text: str
    language_code: str

    def __init__(
        self,
        text: str = ...,
        language_code: str = ...,
    ) -> None: ...


class CartItem(Message):
    sku: str
    quantity: int

    def __init__(
        self,
        sku: str = ...,
        quantity: int = ...,
    ) -> None: ...


class CartResponse(Message):
    items: List[CartItem]
    raw_transcript: str
    detected_intent: str
    confidence_score: float

    def __init__(
        self,
        items: Optional[Iterable[CartItem]] = ...,
        raw_transcript: str = ...,
        detected_intent: str = ...,
        confidence_score: float = ...,
    ) -> None: ...
