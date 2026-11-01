from abc import ABC, abstractmethod
import hashlib
import hmac
from typing import Dict, List, Optional
from fastapi import Request

from core.config import settings
from core.exceptions import AuthenticationError


class WebhookAuthenticator(ABC):
    """
    Abstract strategy interface for authenticating incoming messenger platform webhooks.
    """

    @abstractmethod
    async def authenticate(
        self, request: Request, platform: str, expected_secret: str
    ) -> bool:
        """
        Validates the incoming webhook request against security criteria.
        Returns True if authorized, False otherwise.
        """
        pass


class HeaderTokenAuthenticator(WebhookAuthenticator):
    """
    Validates authentication token provided via HTTP request headers.
    Supports Telegram (X-Telegram-Bot-Api-Secret-Token), Bale, Rubika, and generic secret headers.
    """

    def __init__(self, header_names: Optional[List[str]] = None) -> None:
        self.header_names: List[str] = header_names or [
            "X-Telegram-Bot-Api-Secret-Token",
            "X-Webhook-Secret",
            "X-Bot-Token",
            "Authorization",
        ]

    async def authenticate(
        self, request: Request, platform: str, expected_secret: str
    ) -> bool:
        for header_name in self.header_names:
            header_value = request.headers.get(header_name)
            if header_value:
                # Support "Bearer <token>" formatting in Authorization header
                if header_value.startswith("Bearer "):
                    header_value = header_value[7:].strip()
                if hmac.compare_digest(header_value, expected_secret):
                    return True
        return False


class PathTokenAuthenticator(WebhookAuthenticator):
    """
    Validates authentication token supplied via URL query parameters or path variables.
    """

    def __init__(self, query_param_names: Optional[List[str]] = None) -> None:
        self.query_param_names: List[str] = query_param_names or [
            "token",
            "secret",
            "key",
        ]

    async def authenticate(
        self, request: Request, platform: str, expected_secret: str
    ) -> bool:
        for param in self.query_param_names:
            param_value = request.query_params.get(param)
            if param_value and hmac.compare_digest(param_value, expected_secret):
                return True
        return False


class HmacSignatureAuthenticator(WebhookAuthenticator):
    """
    Validates HMAC-SHA256 signature calculated over the request body payload.
    """

    def __init__(self, signature_header: str = "X-Signature-SHA256") -> None:
        self.signature_header: str = signature_header

    async def authenticate(
        self, request: Request, platform: str, expected_secret: str
    ) -> bool:
        signature = request.headers.get(self.signature_header)
        if not signature:
            return False

        body = await request.body()
        computed_mac = hmac.new(
            expected_secret.encode("utf-8"),
            msg=body,
            digestmod=hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(signature, computed_mac)


class CompositeWebhookAuthenticator(WebhookAuthenticator):
    """
    Chains multiple authentication strategies together (logical OR).
    """

    def __init__(self, strategies: List[WebhookAuthenticator]) -> None:
        self.strategies: List[WebhookAuthenticator] = strategies

    async def authenticate(
        self, request: Request, platform: str, expected_secret: str
    ) -> bool:
        for strategy in self.strategies:
            if await strategy.authenticate(request, platform, expected_secret):
                return True
        return False


class WebhookSecurityRegistry:
    """
    Registry managing authenticators and secrets per messaging platform (Strategy Context).
    """

    def __init__(self) -> None:
        self._authenticators: Dict[str, WebhookAuthenticator] = {}
        self._default_authenticator: WebhookAuthenticator = (
            CompositeWebhookAuthenticator(
                [HeaderTokenAuthenticator(), PathTokenAuthenticator()]
            )
        )
        self._platform_secrets: Dict[str, str] = {}

    def register_strategy(
        self,
        platform: str,
        authenticator: WebhookAuthenticator,
        secret: Optional[str] = None,
    ) -> None:
        self._authenticators[platform.lower()] = authenticator
        if secret:
            self._platform_secrets[platform.lower()] = secret

    def set_platform_secret(self, platform: str, secret: str) -> None:
        self._platform_secrets[platform.lower()] = secret

    def get_strategy(self, platform: str) -> WebhookAuthenticator:
        return self._authenticators.get(platform.lower(), self._default_authenticator)

    def get_secret(self, platform: str) -> str:
        # Fall back to settings.SECRET_KEY if no platform-specific secret is configured
        return self._platform_secrets.get(platform.lower(), settings.SECRET_KEY)

    async def verify_request(self, request: Request, platform: str) -> None:
        authenticator = self.get_strategy(platform)
        expected_secret = self.get_secret(platform)

        is_valid = await authenticator.authenticate(request, platform, expected_secret)
        if not is_valid:
            raise AuthenticationError(
                f"Unauthorized webhook invocation for messenger platform '{platform}'. Invalid security token."
            )


# Default singleton instance of the registry
webhook_security_registry = WebhookSecurityRegistry()
