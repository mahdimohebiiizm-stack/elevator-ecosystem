import pytest

from ai_worker.core.interfaces import ExtractedCartResult
from ai_worker.strategies.cloud_strategy import CloudAPIStrategy


@pytest.mark.asyncio
async def test_cloud_strategy_transcribe() -> None:
    """
    Test STT transcription with non-empty and empty audio payloads.
    """
    strategy = CloudAPIStrategy(simulate_network_delay=False)

    # Empty audio content should yield empty string
    empty_result = await strategy.transcribe(b"")
    assert empty_result == ""

    # Non-empty audio content should return transcribed sentence
    audio_bytes = b"RIFF....WAVEfmt ...."
    transcript = await strategy.transcribe(audio_bytes, mime_type="audio/ogg")
    assert isinstance(transcript, str)
    assert len(transcript) > 0
    assert "SKU-" in transcript


@pytest.mark.asyncio
async def test_cloud_strategy_extract_cart() -> None:
    """
    Test NLP extraction parsing SKUs and quantities from diverse prompt styles.
    """
    strategy = CloudAPIStrategy(simulate_network_delay=False)

    # Prefix pattern: "Order 3 units of SKU-HEADPHONE-99"
    result1: ExtractedCartResult = await strategy.extract_cart(
        "Please order 3 units of SKU-HEADPHONE-99 immediately"
    )
    assert len(result1.items) >= 1
    found = any(
        it.sku == "SKU-HEADPHONE-99" and it.quantity == 3 for it in result1.items
    )
    assert found

    # Suffix pattern: "SKU-MOUSE-55 x 4"
    result2 = await strategy.extract_cart("Add SKU-MOUSE-55 x 4 to my basket")
    assert len(result2.items) >= 1
    found2 = any(it.sku == "SKU-MOUSE-55" and it.quantity == 4 for it in result2.items)
    assert found2

    # Fallback pattern when no SKU is mentioned
    result_default = await strategy.extract_cart("Can I buy something nice?")
    assert len(result_default.items) >= 1
    assert result_default.items[0].quantity > 0
