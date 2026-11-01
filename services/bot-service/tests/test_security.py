from datetime import timedelta
import pytest
import jwt
from core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing_and_verification() -> None:
    """
    Ensure passwords hashed with bcrypt can be verified correctly,
    and incorrect passwords fail verification.
    """
    password: str = "StrongP@ssw0rd!123"
    hashed: str = get_password_hash(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_access_token_creation_and_decoding() -> None:
    """
    Ensure access tokens can be created with subject and extra claims,
    and decoded successfully.
    """
    subject: str = "user-12345"
    token: str = create_access_token(
        subject=subject,
        extra_claims={"role": "admin"},
    )

    payload = decode_access_token(token)
    assert payload["sub"] == subject
    assert payload["role"] == "admin"
    assert "exp" in payload
    assert "iat" in payload


def test_jwt_access_token_expiration() -> None:
    """
    Ensure expired JWT tokens raise jwt.ExpiredSignatureError.
    """
    subject: str = "user-expired"
    # Create token expired 10 minutes ago
    expired_token: str = create_access_token(
        subject=subject,
        expires_delta=timedelta(minutes=-10),
    )

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(expired_token)
