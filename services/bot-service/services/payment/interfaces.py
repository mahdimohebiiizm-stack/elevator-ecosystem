from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class PaymentRequestResult:
    """
    Standardized result contract returned upon initializing an upstream payment session.
    """

    authority: str
    payment_url: str
    fee: int = 0


@dataclass
class PaymentVerificationResult:
    """
    Standardized result contract returned upon verifying a settled payment transaction.
    """

    is_success: bool
    ref_id: Optional[str]
    code: int
    card_pan: Optional[str] = None
    fee: int = 0


class PaymentGateway(ABC):
    """
    Abstract Strategy interface for banking payment gateways.
    Enforces integer amounts in Iranian Rials across all operations.
    """

    @abstractmethod
    async def request_payment(
        self,
        amount: int,
        callback_url: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentRequestResult:
        """
        Requests an authority and payment gateway redirection URL from the upstream provider.
        Amount MUST strictly be represented in Iranian Rials (BigInteger).
        """
        raise NotImplementedError

    @abstractmethod
    async def verify_payment(
        self,
        amount: int,
        authority: str,
    ) -> PaymentVerificationResult:
        """
        Verifies a settled transaction against the upstream provider using the authority token.
        Amount MUST match the transaction amount in Iranian Rials.
        """
        raise NotImplementedError
