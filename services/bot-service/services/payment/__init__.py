"""
Payment domain package providing Strategy ABCs and banking gateway adapters.
"""
from services.payment.interfaces import (
    PaymentGateway,
    PaymentRequestResult,
    PaymentVerificationResult,
)
from services.payment.zarinpal import ZarinPalGateway

__all__ = [
    "PaymentGateway",
    "PaymentRequestResult",
    "PaymentVerificationResult",
    "ZarinPalGateway",
]
