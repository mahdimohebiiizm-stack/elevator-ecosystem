import logging
from typing import Any, Dict, Optional
import httpx

from core.config import settings
from core.exceptions import PaymentProviderError
from services.payment.interfaces import (
    PaymentGateway,
    PaymentRequestResult,
    PaymentVerificationResult,
)

logger = logging.getLogger("shopbot_backend.payment.zarinpal")

ZARINPAL_ERROR_MESSAGES: Dict[int, str] = {
    -9: "Validation error: Invalid input parameters.",
    -10: "Terminal is not valid: Invalid merchant_id or IP address.",
    -11: "Terminal is not active: Terminal requires activation with ZarinPal.",
    -12: "Too many attempts: Rate limit exceeded, retry later.",
    -15: "Terminal suspended: Merchant account suspended.",
    -16: "Level of access is not sufficient.",
    -30: "Floating conversion is not allowed.",
    -31: "Transaction failed: Bank denied payment authorization.",
    -33: "Transaction amount does not match.",
    -34: "Transaction limit exceeded: Max amount or frequency crossed.",
    -40: "Invalid extra params provided.",
    -50: "Paid amount does not match requested amount.",
    -51: "Payment verification failed or session was canceled by customer.",
    -52: "Unexpected internal provider error.",
    -53: "Authority token is not valid or has already been consumed.",
    -54: "Authority token has expired.",
}


class ZarinPalGateway(PaymentGateway):
    """
    ZarinPal v4 Payment Gateway implementation.
    Enforces strict Rial amounts (IRR) without floating-point conversions.
    """

    def __init__(
        self,
        merchant_id: Optional[str] = None,
        sandbox: Optional[bool] = None,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.merchant_id: str = (
            merchant_id
            or getattr(settings, "ZARINPAL_MERCHANT_ID", None)
            or "00000000-0000-0000-0000-000000000000"
        )
        self.sandbox: bool = (
            sandbox
            if sandbox is not None
            else getattr(settings, "ZARINPAL_SANDBOX", True)
        )
        self._custom_client: Optional[httpx.AsyncClient] = http_client

        if self.sandbox:
            self.base_url: str = "https://sandbox.zarinpal.com/pg/v4/payment"
            self.start_pay_url: str = "https://sandbox.zarinpal.com/pg/StartPay/"
        else:
            self.base_url = "https://api.zarinpal.com/pg/v4/payment"
            self.start_pay_url = "https://www.zarinpal.com/pg/StartPay/"

    def _get_client(self) -> httpx.AsyncClient:
        if self._custom_client is not None:
            return self._custom_client
        return httpx.AsyncClient(timeout=10.0)

    async def request_payment(
        self,
        amount: int,
        callback_url: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentRequestResult:
        """
        Requests an authority code and generates the StartPay redirect URL.
        Amount is strictly in Iranian Rials (currency='IRR').
        """
        if amount <= 0:
            raise PaymentProviderError(
                f"Invalid payment amount: {amount}. Amount must be greater than zero."
            )

        payload: Dict[str, Any] = {
            "merchant_id": self.merchant_id,
            "amount": amount,
            "currency": "IRR",
            "callback_url": callback_url,
            "description": description,
            "metadata": metadata or {},
        }

        url = f"{self.base_url}/request.json"

        try:
            client = self._get_client()
            resp = await client.post(url, json=payload)
            if self._custom_client is None:
                await client.aclose()

        except httpx.RequestError as exc:
            logger.error(f"ZarinPal request payment HTTP network failure: {exc}")
            raise PaymentProviderError(f"Payment gateway connection failed: {exc}")

        if resp.status_code != 200:
            raise PaymentProviderError(
                f"ZarinPal HTTP request returned unexpected status {resp.status_code}: {resp.text}"
            )

        response_json = resp.json()
        data = response_json.get("data")
        errors = response_json.get("errors")

        if not data or (isinstance(data, dict) and data.get("code") not in (100, 101)):
            error_code = 0
            if isinstance(errors, dict) and "code" in errors:
                error_code = errors["code"]
            elif isinstance(data, dict) and "code" in data:
                error_code = data["code"]

            err_msg = ZARINPAL_ERROR_MESSAGES.get(
                error_code, f"ZarinPal payment request failed with code {error_code}."
            )
            logger.error(f"ZarinPal request failed: {err_msg} (errors={errors})")
            raise PaymentProviderError(
                message=err_msg, details={"code": error_code, "errors": errors}
            )

        authority: str = str(data["authority"])
        fee: int = int(data.get("fee", 0))
        payment_url: str = f"{self.start_pay_url}{authority}"

        return PaymentRequestResult(
            authority=authority,
            payment_url=payment_url,
            fee=fee,
        )

    async def verify_payment(
        self,
        amount: int,
        authority: str,
    ) -> PaymentVerificationResult:
        """
        Verifies a transaction using the authority and expected amount in Rials.
        Handles code 100 (Success) and 101 (Already Verified - Idempotency).
        """
        payload: Dict[str, Any] = {
            "merchant_id": self.merchant_id,
            "amount": amount,
            "authority": authority,
        }

        url = f"{self.base_url}/verify.json"

        try:
            client = self._get_client()
            resp = await client.post(url, json=payload)
            if self._custom_client is None:
                await client.aclose()

        except httpx.RequestError as exc:
            logger.error(f"ZarinPal verification HTTP network failure: {exc}")
            raise PaymentProviderError(
                f"Payment gateway verification connection failed: {exc}"
            )

        if resp.status_code != 200:
            raise PaymentProviderError(
                f"ZarinPal verification HTTP returned unexpected status {resp.status_code}: {resp.text}"
            )

        response_json = resp.json()
        data = response_json.get("data")
        errors = response_json.get("errors")

        # Code 100: Successfully verified
        # Code 101: Transaction verified previously (Idempotent)
        if isinstance(data, dict) and data.get("code") in (100, 101):
            ref_id_raw = data.get("ref_id")
            ref_id: Optional[str] = str(ref_id_raw) if ref_id_raw is not None else None
            card_pan = data.get("card_pan")
            fee = int(data.get("fee", 0))
            code = int(data["code"])

            return PaymentVerificationResult(
                is_success=True,
                ref_id=ref_id,
                code=code,
                card_pan=card_pan,
                fee=fee,
            )

        # Unsuccessful verification
        error_code = 0
        if isinstance(errors, dict) and "code" in errors:
            error_code = errors["code"]
        elif isinstance(data, dict) and "code" in data:
            error_code = data["code"]

        err_msg = ZARINPAL_ERROR_MESSAGES.get(
            error_code,
            f"Payment verification rejected by ZarinPal with code {error_code}.",
        )
        logger.warning(f"ZarinPal verify rejected: {err_msg} (errors={errors})")

        return PaymentVerificationResult(
            is_success=False,
            ref_id=None,
            code=error_code,
            fee=0,
        )
