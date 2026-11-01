import asyncio
from typing import Optional, cast
import grpc
import pytest

from ai_worker.core.interfaces import ExtractedCartResult, NLPStrategy, STTStrategy
from ai_worker.grpc_server import AIProcessorService
from protos import ai_processor_pb2


class SlowSTTStrategy(STTStrategy):
    async def transcribe(
        self,
        audio_data: bytes,
        mime_type: Optional[str] = None,
        language_code: Optional[str] = None,
    ) -> str:
        await asyncio.sleep(0.3)
        return "Slow transcription"


class SlowNLPStrategy(NLPStrategy):
    async def extract_cart(
        self,
        text: str,
        language_code: Optional[str] = None,
    ) -> ExtractedCartResult:
        await asyncio.sleep(0.3)
        return ExtractedCartResult(items=[])


class MockServicerContext:
    def __init__(self) -> None:
        self.code: Optional[grpc.StatusCode] = None
        self.details: Optional[str] = None

    def set_code(self, code: grpc.StatusCode) -> None:
        self.code = code

    def set_details(self, details: str) -> None:
        self.details = details


@pytest.mark.asyncio
async def test_grpc_process_voice_command_hard_timeout() -> None:
    """
    Verifies that ProcessVoiceCommand catches asyncio.TimeoutError when exceeding
    request_timeout, sets grpc.StatusCode.DEADLINE_EXCEEDED, and returns cleanly.
    """
    service = AIProcessorService(
        stt_strategy=SlowSTTStrategy(),
        request_timeout=0.05,  # 50ms timeout
    )
    context = MockServicerContext()

    req = ai_processor_pb2.VoiceRequest(audio_content=b"test_audio")
    resp = await service.ProcessVoiceCommand(
        req, cast(grpc.aio.ServicerContext, context)
    )

    assert resp is not None
    assert len(resp.items) == 0
    assert context.code == grpc.StatusCode.DEADLINE_EXCEEDED
    assert context.details is not None
    assert "exceeded hard deadline" in context.details


@pytest.mark.asyncio
async def test_grpc_extract_cart_hard_timeout() -> None:
    """
    Verifies that ExtractCartFromText catches timeout, sets DEADLINE_EXCEEDED, and returns cleanly.
    """
    service = AIProcessorService(
        nlp_strategy=SlowNLPStrategy(),
        request_timeout=0.05,  # 50ms timeout
    )
    context = MockServicerContext()

    req = ai_processor_pb2.TextRequest(text="Long text that hangs")
    resp = await service.ExtractCartFromText(
        req, cast(grpc.aio.ServicerContext, context)
    )

    assert resp is not None
    assert len(resp.items) == 0
    assert context.code == grpc.StatusCode.DEADLINE_EXCEEDED
    assert context.details is not None
    assert "exceeded hard deadline" in context.details
