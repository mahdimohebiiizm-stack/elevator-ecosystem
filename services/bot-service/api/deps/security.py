from typing import Optional
import uuid
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select

from api.deps.uow import get_uow
from core.exceptions import AuthenticationError
from core.security import decode_access_token
from db.models.user import User, UserRole
from infrastructure.db.uow import IUnitOfWork
from infrastructure.security.webhook_auth import webhook_security_registry


async def verify_webhook_security(
    request: Request,
) -> None:
    """
    FastAPI dependency that enforces strategy-based authentication for incoming webhooks.
    Extracts the messenger platform identifier from the path parameter and executes
    the configured authentication strategy.
    """
    platform: str = request.path_params.get("platform", "generic")
    await webhook_security_registry.verify_request(request, platform)


async def get_current_user(
    request: Request,
    uow: IUnitOfWork = Depends(get_uow),
) -> User:
    """
    FastAPI dependency retrieving authenticated user from HttpOnly cookie or Authorization Bearer header.
    Guarantees zero LocalStorage token requirement for web clients.
    """
    # 1. Check HttpOnly cookie first
    token: Optional[str] = request.cookies.get("access_token")

    # 2. Fallback to Authorization Bearer header
    if not token:
        auth_header: Optional[str] = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        raise AuthenticationError("Authentication token is missing")

    try:
        payload = decode_access_token(token)
        user_id_str: Optional[str] = payload.get("sub")
        if not user_id_str:
            raise AuthenticationError("Invalid token payload: missing subject")
        user_uuid = uuid.UUID(user_id_str)
    except Exception as exc:
        raise AuthenticationError(f"Invalid authentication token: {exc}")

    query = select(User).where(User.id == user_uuid)
    result = await uow.session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationError("Authenticated user does not exist")

    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Enforces Role-Based Access Control (RBAC), verifying that the authenticated user
    possesses the ADMIN role. Raises 403 Forbidden otherwise.
    """
    if current_user.role != UserRole.ADMIN and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin only.",
        )
    return current_user
