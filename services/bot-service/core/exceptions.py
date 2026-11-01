from typing import Any, Optional


class AppError(Exception):
    """
    Base domain exception for all application-level business errors.
    Strictly framework-agnostic with zero HTTP or ASGI dependencies.
    """

    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.message: str = message
        self.details: Optional[Any] = details


class NotFoundError(AppError):
    """
    Raised when a requested domain resource or entity cannot be located.
    """

    pass


class InsufficientStockError(AppError):
    """
    Raised when requested order quantity exceeds available product inventory stock.
    """

    pass


class InvalidOrderError(AppError):
    """
    Raised when order validation fails (e.g., empty cart, invalid quantities).
    """

    pass


class AuthenticationError(AppError):
    """
    Raised when incoming credentials or webhook authentication tokens fail validation.
    """

    pass


class ForbiddenError(AppError):
    """
    Raised when an authenticated actor lacks necessary permission.
    """

    pass


class LockAcquisitionError(AppError):
    """
    Raised when a distributed Redlock cannot be acquired within the designated timeout.
    """

    pass


class PaymentProviderError(AppError):
    """
    Raised when an upstream payment gateway provider returns an error or communication fails.
    """

    pass


class InvalidPaymentError(AppError):
    """
    Raised when payment validation fails (e.g., amount mismatch, invalid status, unverified authority).
    """

    pass
