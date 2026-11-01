from datetime import datetime
from typing import List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field

from db.models.user import UserRole


class UserBase(BaseModel):
    """
    Shared properties for user entities.
    """

    messenger_id: str = Field(
        ...,
        pattern=r"^[a-zA-Z0-9_\-\:]{3,64}$",
        description="Unique messenger platform user ID",
    )
    phone: Optional[str] = Field(
        None,
        pattern=r"^\+?[0-9]{10,15}$",
        description="E.164 formatted phone number",
    )
    role: UserRole = Field(
        default=UserRole.CUSTOMER, description="User authorization role"
    )
    wallet_balance: int = Field(
        default=0,
        ge=0,
        description="Wallet balance in Iranian Rials (BigInteger)",
    )


class UserCreate(UserBase):
    """
    Payload for creating a new user.
    """

    pass


class BotAuthRequest(BaseModel):
    """
    Contract for authenticating or auto-provisioning a messenger bot user.
    """

    messenger_id: str = Field(
        ...,
        pattern=r"^[a-zA-Z0-9_\-\:]{3,64}$",
        description="Unique messenger platform user identifier",
    )
    phone: Optional[str] = Field(
        None,
        pattern=r"^\+?[0-9]{10,15}$",
        description="Optional phone number provided via bot contact share",
    )


class WebLoginRequest(BaseModel):
    """
    Contract for authenticating web users via phone and OTP code.
    """

    phone: str = Field(..., description="Customer phone number")
    otpCode: Optional[str] = Field(None, description="SMS OTP verification code")
    messenger_id: Optional[str] = Field(None, description="Optional unique identifier")


class UserUpdate(BaseModel):
    """
    Payload for updating an existing user's attributes.
    """

    messenger_id: Optional[str] = Field(
        None,
        pattern=r"^[a-zA-Z0-9_\-\:]{3,64}$",
        description="Updated unique messenger ID",
    )
    phone: Optional[str] = Field(
        None,
        pattern=r"^\+?[0-9]{10,15}$",
        description="Updated phone number",
    )
    role: Optional[UserRole] = Field(None, description="Updated user role")
    wallet_balance: Optional[int] = Field(
        None,
        ge=0,
        description="Updated wallet balance in Rials",
    )


class UserResponse(UserBase):
    """
    Complete user DTO returned to clients with database timestamps.
    """

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WebLoginResponse(UserResponse):
    """
    Web authentication response containing access token and user metadata.
    """

    access_token: str = Field(..., description="JWT Bearer access token")
    token_type: str = Field(default="bearer", description="Token scheme type")
    user: Optional[UserResponse] = Field(
        default=None, description="Embedded user profile"
    )


class UserAddressBase(BaseModel):
    """
    Shared properties for user delivery addresses.
    """

    title: str = Field(..., description="Address label (e.g., Home, Office)")
    province: str = Field(..., description="State or province name")
    city: str = Field(..., description="City name")
    postal_code: str = Field(
        ...,
        pattern=r"^[0-9]{10}$",
        description="10-digit postal code",
    )
    full_address: str = Field(
        ..., description="Detailed street address and building info"
    )
    latitude: Optional[float] = Field(
        None, description="Geographic latitude coordinate"
    )
    longitude: Optional[float] = Field(
        None, description="Geographic longitude coordinate"
    )
    is_default: bool = Field(
        default=False, description="Whether this is the primary delivery address"
    )


class UserAddressCreate(UserAddressBase):
    """
    Payload for creating a new user address.
    """

    user_id: uuid.UUID = Field(..., description="Parent user foreign key identifier")


class UserAddressUpdate(BaseModel):
    """
    Payload for updating an existing address.
    """

    title: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = Field(
        None,
        pattern=r"^[0-9]{10}$",
        description="10-digit postal code",
    )
    full_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: Optional[bool] = None


class UserAddressResponse(UserAddressBase):
    """
    Complete user address response DTO with database timestamps.
    """

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserResponse(BaseModel):
    """
    User DTO for Admin CRM user management dashboard.
    """

    id: uuid.UUID
    phone: Optional[str] = None
    name: Optional[str] = None
    role: UserRole
    is_active: bool = True
    wallet_balance: int = 0
    messenger_id: Optional[str] = None
    telegram_id: Optional[str] = None
    bale_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminBulkDeactivateRequest(BaseModel):
    """
    Payload for bulk deactivating selected users in one transaction.
    """

    user_ids: List[uuid.UUID] = Field(
        ..., min_length=1, description="List of user UUIDs to deactivate"
    )


class AdminBulkActionResponse(BaseModel):
    """
    Summary response for bulk actions.
    """

    affected_count: int
    message: str


class AdminUserUpdateRequest(BaseModel):
    """
    Contract for Admin modifying a user's profile, role, phone, and password.
    """

    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = Field(
        None, min_length=4, description="Optional new plain text password"
    )
    is_active: Optional[bool] = None


