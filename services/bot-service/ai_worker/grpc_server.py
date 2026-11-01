import asyncio
import logging
from typing import Optional
import grpc

from ai_worker.core.interfaces import NLPStrategy, STTStrategy
from ai_worker.strategies.cloud_strategy import CloudAPIStrategy
from protos import ai_processor_pb2, ai_processor_pb2_grpc

logger = logging.getLogger("shopbot_backend.ai_worker.grpc_server")


class AIProcessorService(ai_processor_pb2_grpc.AIProcessorServicer):
    """
    gRPC Servicer implementing AIProcessor RPC endpoints.
    Delegates Speech-to-Text and NLP Cart Extraction to injected Strategy instances.
    """

    def __init__(
        self,
        stt_strategy: Optional[STTStrategy] = None,
        nlp_strategy: Optional[NLPStrategy] = None,
        request_timeout: float = 30.0,
    ) -> None:
        self.stt_strategy: STTStrategy = stt_strategy or CloudAPIStrategy()
        self.nlp_strategy: NLPStrategy = nlp_strategy or CloudAPIStrategy()
        self.request_timeout: float = request_timeout

    async def ProcessVoiceCommand(
        self,
        request: ai_processor_pb2.VoiceRequest,
        context: grpc.aio.ServicerContext,
    ) -> ai_processor_pb2.CartResponse:
        """
        Receives raw speech audio, executes STT transcription, and extracts cart SKU items.
        Protected by a strict hard timeout (default 30.0s) to guard against CPU/RAM lockups.
        """

        async def _execute() -> ai_processor_pb2.CartResponse:
            transcript = await self.stt_strategy.transcribe(
                audio_data=request.audio_content,
                mime_type=request.mime_type or None,
                language_code=request.language_code or None,
            )

            cart_result = await self.nlp_strategy.extract_cart(
                text=transcript,
                language_code=request.language_code or None,
            )

            pb_items = [
                ai_processor_pb2.CartItem(sku=it.sku, quantity=it.quantity)
                for it in cart_result.items
            ]

            return ai_processor_pb2.CartResponse(
                items=pb_items,
                raw_transcript=cart_result.raw_transcript or transcript,
                detected_intent=cart_result.detected_intent,
                confidence_score=cart_result.confidence_score,
            )

        try:
            return await asyncio.wait_for(_execute(), timeout=self.request_timeout)
        except (asyncio.TimeoutError, TimeoutError):
            logger.error(
                f"ProcessVoiceCommand timed out after {self.request_timeout}s deadline."
            )
            context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
            context.set_details(
                f"Voice command processing exceeded hard deadline of {self.request_timeout}s."
            )
            return ai_processor_pb2.CartResponse()
        except Exception as exc:
            logger.error(f"Error in ProcessVoiceCommand: {exc}", exc_info=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(exc))
            return ai_processor_pb2.CartResponse()

    async def ExtractCartFromText(
        self,
        request: ai_processor_pb2.TextRequest,
        context: grpc.aio.ServicerContext,
    ) -> ai_processor_pb2.CartResponse:
        """
        Extracts cart SKU items and purchasing intent from text.
        Protected by a strict hard timeout (default 30.0s) to prevent resource hangs.
        """

        async def _execute() -> ai_processor_pb2.CartResponse:
            cart_result = await self.nlp_strategy.extract_cart(
                text=request.text,
                language_code=request.language_code or None,
            )

            pb_items = [
                ai_processor_pb2.CartItem(sku=it.sku, quantity=it.quantity)
                for it in cart_result.items
            ]

            return ai_processor_pb2.CartResponse(
                items=pb_items,
                raw_transcript=cart_result.raw_transcript or request.text,
                detected_intent=cart_result.detected_intent,
                confidence_score=cart_result.confidence_score,
            )

        try:
            return await asyncio.wait_for(_execute(), timeout=self.request_timeout)
        except (asyncio.TimeoutError, TimeoutError):
            logger.error(
                f"ExtractCartFromText timed out after {self.request_timeout}s deadline."
            )
            context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
            context.set_details(
                f"Cart text extraction exceeded hard deadline of {self.request_timeout}s."
            )
            return ai_processor_pb2.CartResponse()
        except Exception as exc:
            logger.error(f"Error in ExtractCartFromText: {exc}", exc_info=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(exc))
            return ai_processor_pb2.CartResponse()


async def create_grpc_server(
    host: str = "0.0.0.0",
    port: int = 50051,
    stt_strategy: Optional[STTStrategy] = None,
    nlp_strategy: Optional[NLPStrategy] = None,
) -> grpc.aio.Server:
    """
    Factory creating and configuring the async gRPC server.
    """
    server = grpc.aio.server()
    servicer = AIProcessorService(stt_strategy=stt_strategy, nlp_strategy=nlp_strategy)
    ai_processor_pb2_grpc.add_AIProcessorServicer_to_server(servicer, server)
    server.add_insecure_port(f"{host}:{port}")
    return server


async def serve(host: str = "0.0.0.0", port: int = 50051) -> None:
    """
    Launches and awaits the gRPC microservice server.
    """
    logging.basicConfig(level=logging.INFO)
    server = await create_grpc_server(host=host, port=port)
    logger.info(f"AI Processor gRPC server listening on {host}:{port}")
    await server.start()
    await server.wait_for_termination()


if __name__ == "__main__":
    asyncio.run(serve())
