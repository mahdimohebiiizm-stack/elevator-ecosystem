"""
Web infrastructure module containing error mappers, middleware, and HTTP presentation utilities.
"""
from infrastructure.web.correlation import CorrelationIdMiddleware, get_correlation_id

__all__ = ["CorrelationIdMiddleware", "get_correlation_id"]
