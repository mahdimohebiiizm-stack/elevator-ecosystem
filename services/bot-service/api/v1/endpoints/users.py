import uuid
from typing import Dict, List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update

from api.deps.security import get_current_user, get_current_admin_user
from api.deps.uow import get_uow
from api.deps.use_cases import get_authenticate_bot_user_use_case
from application.use_cases.user_use_cases import AuthenticateBotUserUseCase
from core.config import settings
from core.security import create_access_token, get_password_hash
from db.models.user import User, UserRole
from infrastructure.db.uow import IUnitOfWork
from schemas.user import (
    AdminBulkActionResponse,
    AdminBulkDeactivateRequest,
    AdminUserResponse,
    AdminUserUpdateRequest,
    BotAuthRequest,
    UserResponse,
    WebLoginRequest,
    WebLoginResponse,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/bot-auth",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate or provision a messenger bot user",
    description="Locates existing user by messenger identifier or provisions a new customer account, issuing HttpOnly access token.",
)
async def authenticate_bot_user_endpoint(
    request_dto: BotAuthRequest,
    response: Response,
    use_case: AuthenticateBotUserUseCase = Depends(get_authenticate_bot_user_use_case),
) -> UserResponse:
    """
    Traffic controller endpoint for messenger bot authentication.
    Issues JWT access token stored strictly in HttpOnly cookie.
    """
    user_response: UserResponse = await use_case.execute(request_dto=request_dto)

    token: str = create_access_token(
        subject=str(user_response.id),
        extra_claims={
            "role": user_response.role.value,
            "phone": user_response.phone,
        },
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return user_response


@router.post(
    "/login",
    response_model=WebLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Web customer login setting HttpOnly access token cookie and returning token",
    description="Authenticates or provisions user, returning access_token and setting HttpOnly cookie.",
)
async def login_endpoint(
    request_dto: Union[WebLoginRequest, BotAuthRequest],
    response: Response,
    use_case: AuthenticateBotUserUseCase = Depends(get_authenticate_bot_user_use_case),
) -> WebLoginResponse:
    """
    Web authentication endpoint issuing JWT token and HttpOnly cookie.
    """
    phone = request_dto.phone
    raw_messenger_id = getattr(request_dto, "messenger_id", None)
    if not raw_messenger_id:
        clean_phone = phone.replace("+", "").strip() if phone else "guest"
        raw_messenger_id = f"web_{clean_phone}"

    bot_dto = BotAuthRequest(messenger_id=raw_messenger_id, phone=phone)
    user_response: UserResponse = await use_case.execute(request_dto=bot_dto)

    token: str = create_access_token(
        subject=str(user_response.id),
        extra_claims={
            "role": user_response.role.value,
            "phone": user_response.phone,
        },
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return WebLoginResponse(
        **user_response.model_dump(),
        access_token=token,
        token_type="bearer",
        user=user_response,
    )


@router.post(
    "/refresh",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Silent refresh of HttpOnly access token cookie",
    description="Refreshes access token for authenticated session using existing credentials.",
)
async def refresh_endpoint(
    response: Response,
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Silent token refresh endpoint resetting HttpOnly cookie expiration.
    """
    token: str = create_access_token(
        subject=str(current_user.id),
        extra_claims={
            "role": current_user.role.value,
            "phone": current_user.phone,
        },
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Customer logout clearing HttpOnly auth cookie",
    description="Clears HttpOnly access token cookie to terminate session.",
)
async def logout_endpoint(response: Response) -> Dict[str, str]:
    """
    Destroys active session cookie.
    """
    response.delete_cookie(key="access_token")
    return {"status": "success", "message": "Successfully logged out"}


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get profile of current authenticated user",
    description="Returns profile information of user authenticated via HttpOnly cookie.",
)
async def get_me_endpoint(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Profile retrieval endpoint for active customer session.
    """
    return UserResponse.model_validate(current_user)


@router.get(
    "/admin/all",
    response_model=List[AdminUserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all users for Admin CRM",
    description="Secured by RBAC (Admin only). Returns all registered users with their roles, activation status, and creation timestamps.",
)
async def get_all_users_admin(
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> List[AdminUserResponse]:
    """
    Admin CRM retrieval of all registered users.
    """
    stmt = select(User).order_by(User.created_at.desc())
    result = await uow.session.execute(stmt)
    users = result.scalars().all()
    return [AdminUserResponse.model_validate(u) for u in users]


@router.patch(
    "/admin/bulk-deactivate",
    response_model=AdminBulkActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk deactivate selected users",
    description="Secured by RBAC (Admin only). Accepts a list of user UUIDs and sets is_active=False in a single database transaction.",
)
async def bulk_deactivate_users(
    payload: AdminBulkDeactivateRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> AdminBulkActionResponse:
    """
    Atomic bulk deactivation of selected users. Protects the calling admin from self-deactivation.
    """
    if not payload.user_ids:
        return AdminBulkActionResponse(
            affected_count=0,
            message="هیچ کاربری انتخاب نشده است.",
        )

    # Filter out current admin user to prevent lockout
    filtered_ids = [uid for uid in payload.user_ids if uid != current_admin.id]
    if not filtered_ids:
        return AdminBulkActionResponse(
            affected_count=0,
            message="شما نمی‌توانید حساب کاربری فعال خود را غیرفعال کنید.",
        )

    stmt = (
        update(User)
        .where(User.id.in_(filtered_ids))
        .values(is_active=False)
    )
    result = await uow.session.execute(stmt)
    await uow.commit()
    affected = result.rowcount

    return AdminBulkActionResponse(
        affected_count=affected,
        message=f"{affected} کاربر با موفقیت غیرفعال شدند.",
    )


@router.patch(
    "/admin/{user_id}/status",
    response_model=AdminUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle single user active status",
    description="Secured by RBAC (Admin only). Sets user is_active flag.",
)
async def update_user_status(
    user_id: str,
    active: bool,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> AdminUserResponse:
    """
    Toggle single user status for Admin CRM quick actions.
    """
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"شناسه کاربر نامعتبر است: {user_id}",
        )

    if user_uuid == current_admin.id and not active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="شما نمی‌توانید حساب کاربری فعال خود را غیرفعال نمایید.",
        )

    stmt = select(User).where(User.id == user_uuid)
    result = await uow.session.execute(stmt)
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"کاربر با شناسه '{user_id}' یافت نشد.",
        )

    target_user.is_active = active
    await uow.commit()
    await uow.session.refresh(target_user)
    return AdminUserResponse.model_validate(target_user)


@router.patch(
    "/admin/{user_id}",
    response_model=AdminUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user details by Admin",
    description="Secured by RBAC (Admin only). Allows modifying Name, Phone, Role, Password, and is_active.",
)
async def update_user_details(
    user_id: str,
    payload: AdminUserUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> AdminUserResponse:
    """
    Update full profile of a user including role and password.
    """
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"شناسه کاربر نامعتبر است: {user_id}",
        )

    stmt = select(User).where(User.id == user_uuid)
    result = await uow.session.execute(stmt)
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"کاربر با شناسه '{user_id}' یافت نشد.",
        )

    if payload.name is not None:
        target_user.name = payload.name.strip()

    if payload.phone is not None:
        new_phone = payload.phone.strip()
        # Check uniqueness if phone is changing
        if new_phone != target_user.phone:
            dup_stmt = select(User).where(User.phone == new_phone, User.id != target_user.id)
            if (await uow.session.execute(dup_stmt)).scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"شماره تماس '{new_phone}' قبلاً برای کاربر دیگری ثبت شده است.",
                )
            target_user.phone = new_phone
            # update messenger_id fallback if web-based
            if target_user.messenger_id and target_user.messenger_id.startswith("web_"):
                target_user.messenger_id = f"web_{new_phone.replace('+', '').strip()}"

    if payload.role is not None:
        if target_user.id == current_admin.id and payload.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="شما نمی‌توانید نقش مدیر ارشد حساب فعال خود را تنزل دهید.",
            )
        target_user.role = payload.role

    if payload.is_active is not None:
        if target_user.id == current_admin.id and not payload.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="شما نمی‌توانید حساب کاربری فعال خود را غیرفعال نمایید.",
            )
        target_user.is_active = payload.is_active

    if payload.password:
        target_user.password_hash = get_password_hash(payload.password)

    await uow.commit()
    await uow.session.refresh(target_user)
    return AdminUserResponse.model_validate(target_user)
