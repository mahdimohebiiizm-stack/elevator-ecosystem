from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import jwt
from passlib.context import CryptContext

from core.config import settings

# Password hashing context using standard bcrypt
pwd_context: CryptContext = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a stored bcrypt hash.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Generates a secure bcrypt password hash from a plain text password.
    """
    return pwd_context.hash(password)


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Encodes and signs a JSON Web Token (JWT) with expiration and subject claims.
    """
    current_time: datetime = datetime.now(timezone.utc)
    if expires_delta is not None:
        expire_time: datetime = current_time + expires_delta
    else:
        expire_time = current_time + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    claims: Dict[str, Any] = {
        "sub": str(subject),
        "iat": int(current_time.timestamp()),
        "exp": int(expire_time.timestamp()),
    }
    if extra_claims:
        claims.update(extra_claims)

    encoded_jwt: str = jwt.encode(
        claims,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a JWT token using the configured secret key and algorithm.
    Raises jwt.PyJWTError subclasses upon validation failure.
    """
    payload: Dict[str, Any] = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    return payload
