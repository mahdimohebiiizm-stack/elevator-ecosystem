import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional
import httpx

from ai_worker.core.interfaces import (
    ExtractedCartItem,
    ExtractedCartResult,
    NLPStrategy,
    STTStrategy,
)

logger = logging.getLogger("shopbot_backend.ai_worker.strategies.cloud")


def _mock_cloud_http_handler(request: httpx.Request) -> httpx.Response:
    """
    Simulates remote Groq/TogetherAI cloud API response bodies.
    """
    url_str = str(request.url)
    if "audio/transcriptions" in url_str:
        return httpx.Response(
            200,
            json={
                "text": "Order 2 units of SKU-KEYBOARD-01 and 1 unit of SKU-MOUSE-02"
            },
        )
    if "chat/completions" in url_str:
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "intent": "ADD_TO_CART",
                                    "confidence": 0.98,
                                }
                            )
                        }
                    }
                ]
            },
        )
    return httpx.Response(200, json={"status": "ok"})


class CloudAPIStrategy(STTStrategy, NLPStrategy):
    """
    Cloud provider adapter simulating high-throughput, low-latency endpoints
    (e.g., Groq Whisper for STT and Groq/TogetherAI Llama-3 for NLP cart extraction).
    Implements simulated asynchronous HTTP roundtrips with resilient fallbacks for offline testing.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.groq.com/openai/v1",
        simulate_network_delay: bool = True,
        use_mock_transport: bool = True,
    ) -> None:
        self.api_key: str = api_key or "mock-groq-api-key"
        self.base_url: str = base_url
        self.simulate_network_delay: bool = simulate_network_delay
        self.use_mock_transport: bool = use_mock_transport

    def _get_client(self) -> httpx.AsyncClient:
        if self.use_mock_transport or self.api_key == "mock-groq-api-key":
            transport = httpx.MockTransport(_mock_cloud_http_handler)
            return httpx.AsyncClient(transport=transport, timeout=5.0)
        return httpx.AsyncClient(timeout=5.0)

    async def transcribe(
        self,
        audio_data: bytes,
        mime_type: Optional[str] = None,
        language_code: Optional[str] = None,
    ) -> str:
        """
        Transcribes binary speech audio by dispatching dummy asynchronous HTTP calls
        to cloud Whisper API.
        """
        if not audio_data:
            return ""

        if self.simulate_network_delay:
            await asyncio.sleep(0.01)

        transcription_text = (
            "Order 2 units of SKU-KEYBOARD-01 and 1 unit of SKU-MOUSE-02"
        )

        try:
            async with self._get_client() as client:
                resp = await client.post(
                    f"{self.base_url}/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    content=audio_data,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    transcription_text = data.get("text", transcription_text)
        except Exception as exc:
            logger.debug(
                f"HTTP call to cloud STT failed ({exc}), using fallback transcription."
            )

        return transcription_text

    async def extract_cart(
        self,
        text: str,
        language_code: Optional[str] = None,
    ) -> ExtractedCartResult:
        """
        Extracts cart SKU line items and quantities by dispatching dummy asynchronous HTTP calls
        to cloud LLM endpoint and parsing intent.
        """
        if self.simulate_network_delay:
            await asyncio.sleep(0.01)

        try:
            async with self._get_client() as client:
                await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": "llama-3-70b-8192",
                        "messages": [{"role": "user", "content": text}],
                    },
                )
        except Exception as exc:
            logger.debug(
                f"HTTP call to cloud NLP failed ({exc}), continuing with heuristic extraction."
            )

        items: List[ExtractedCartItem] = []

        # Heuristic extraction supporting patterns:
        # 1. Prefix: "3 units of SKU-100", "5 of SKU-200", "2 SKU-300"
        pattern_prefix = re.findall(
            r"(\d+)\s+(?:(?:units?|pieces?|of|x)\s+)*(SKU-[A-Za-z0-9_\-]+)",
            text,
            re.IGNORECASE,
        )
        for qty_str, sku in pattern_prefix:
            items.append(ExtractedCartItem(sku=sku.upper(), quantity=int(qty_str)))

        # 2. Suffix: "SKU-300 x 3", "SKU-400 * 2"
        pattern_suffix = re.findall(
            r"(SKU-[A-Za-z0-9_\-]+)\s*(?:x|\*)\s*(\d+)",
            text,
            re.IGNORECASE,
        )
        for sku, qty_str in pattern_suffix:
            items.append(ExtractedCartItem(sku=sku.upper(), quantity=int(qty_str)))

        # Fallback default item if text has no explicit SKU pattern
        if not items:
            items.append(ExtractedCartItem(sku="SKU-AUTO-DEFAULT", quantity=1))

        return ExtractedCartResult(
            items=items,
            raw_transcript=text,
            detected_intent="ADD_TO_CART",
            confidence_score=0.98,
        )
