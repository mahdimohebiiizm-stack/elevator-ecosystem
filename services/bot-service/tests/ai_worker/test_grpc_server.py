import grpc
import pytest

from ai_worker.grpc_server import AIProcessorService
from ai_worker.strategies.cloud_strategy import CloudAPIStrategy
from protos import ai_processor_pb2, ai_processor_pb2_grpc


@pytest.mark.asyncio
async def test_grpc_server_end_to_end() -> None:
    """
    Spins up an in-process async gRPC server on an ephemeral OS port,
    invokes both RPC endpoints via gRPC stub, and verifies contract responses.
    """
    server = grpc.aio.server()
    service = AIProcessorService(
        stt_strategy=CloudAPIStrategy(simulate_network_delay=False),
        nlp_strategy=CloudAPIStrategy(simulate_network_delay=False),
    )
    ai_processor_pb2_grpc.add_AIProcessorServicer_to_server(service, server)
    port = server.add_insecure_port("127.0.0.1:0")
    await server.start()

    channel = grpc.aio.insecure_channel(f"127.0.0.1:{port}")
    stub = ai_processor_pb2_grpc.AIProcessorStub(channel)

    try:
        # Test RPC 1: ProcessVoiceCommand
        voice_req = ai_processor_pb2.VoiceRequest(
            audio_content=b"SIMULATED_VOICE_AUDIO_DATA",
            mime_type="audio/ogg",
            language_code="fa",
        )
        voice_resp = await stub.ProcessVoiceCommand(voice_req)
        assert len(voice_resp.items) > 0
        for item in voice_resp.items:
            assert isinstance(item.sku, str)
            assert item.quantity > 0
        assert len(voice_resp.raw_transcript) > 0
        assert voice_resp.detected_intent == "ADD_TO_CART"

        # Test RPC 2: ExtractCartFromText
        text_req = ai_processor_pb2.TextRequest(
            text="Please add 5 units of SKU-TABLET-09 to cart",
            language_code="en",
        )
        text_resp = await stub.ExtractCartFromText(text_req)
        assert len(text_resp.items) > 0
        sku_found = any(
            it.sku == "SKU-TABLET-09" and it.quantity == 5 for it in text_resp.items
        )
        assert sku_found
        assert text_resp.detected_intent == "ADD_TO_CART"
        assert text_resp.confidence_score > 0.5

    finally:
        await channel.close()
        await server.stop(grace=0.5)
