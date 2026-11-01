from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ExtractedCartItem:
    """
    Representation of an individual product item extracted from unstructured voice or text.
    """

    sku: str
    quantity: int


@dataclass
class ExtractedCartResult:
    """
    Encapsulates complete intent parsing results, including item list and confidence score.
    """

    items: List[ExtractedCartItem] = field(default_factory=list)
    raw_transcript: str = ""
    detected_intent: str = "ADD_TO_CART"
    confidence_score: float = 1.0


class STTStrategy(ABC):
    """
    Strategy interface for Speech-to-Text audio transcription.
    Enables swapping cloud providers (Groq Whisper, OpenAI Whisper, Deepgram)
    or local inference engines (faster-whisper).
    """

    @abstractmethod
    async def transcribe(
        self,
        audio_data: bytes,
        mime_type: Optional[str] = None,
        language_code: Optional[str] = None,
    ) -> str:
        """
        Transcribes binary speech audio into natural language text.
        """
        raise NotImplementedError


class NLPStrategy(ABC):
    """
    Strategy interface for Natural Language Processing and cart extraction.
    Enables swapping LLM providers (Groq Llama 3, TogetherAI, OpenAI)
    or localized regex/NER models.
    """

    @abstractmethod
    async def extract_cart(
        self,
        text: str,
        language_code: Optional[str] = None,
    ) -> ExtractedCartResult:
        """
        Analyzes natural language text to extract purchasing intent and structured cart items.
        """
        raise NotImplementedError
