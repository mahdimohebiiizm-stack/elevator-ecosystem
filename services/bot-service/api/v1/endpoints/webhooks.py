import logging
from fastapi import APIRouter, BackgroundTasks, Depends, status

from api.deps.idempotency import IdempotencyContext, check_webhook_idempotency
from api.deps.security import verify_webhook_security
from api.deps.use_cases import get_process_webhook_use_case
from application.use_cases.webhook_use_cases import ProcessWebhookUseCase
from schemas.webhook import WebhookPayload, WebhookResponse

logger = logging.getLogger("shopbot_backend.routers.webhooks")

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


async def log_webhook_metric_background(platform: str, update_id: int) -> None:
    """Non-blocking background task logging analytics telemetry for incoming webhook events."""
    logger.debug(
        f"Telemetry metric logged for webhook [{platform} - update_id: {update_id}]"
    )


@router.post(
    "/{platform}",
    response_model=WebhookResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_webhook_security)],
    summary="Ingest incoming messenger webhook events",
    description=(
        "Unified entrypoint for messenger webhooks (Telegram, Bale, Rubika). "
        "Enforces dynamic strategy authentication and Redis/Memory idempotency."
    ),
)
async def ingest_webhook(
    platform: str,
    payload: WebhookPayload,
    background_tasks: BackgroundTasks,
    use_case: ProcessWebhookUseCase = Depends(get_process_webhook_use_case),
    idempotency: IdempotencyContext = Depends(check_webhook_idempotency),
) -> WebhookResponse:
    """
    Traffic controller endpoint for messenger webhooks.
    Strictly free of business logic and database access.
    """
    # Exactly-Once execution enforcement: immediate 200 OK for replays
    if idempotency.is_duplicate:
        return WebhookResponse(
            status="ok",
            update_id=payload.update_id,
            processed=False,
            message="Duplicate update_id acknowledged without reprocessing.",
        )

    # Delegate event execution to application use case
    result: WebhookResponse = await use_case.execute(platform=platform, payload=payload)

    # Persist processed state to prevent replay
    await idempotency.mark_completed()

    # Offload non-critical telemetry to background execution
    background_tasks.add_task(
        log_webhook_metric_background, platform, payload.update_id
    )

    return result
