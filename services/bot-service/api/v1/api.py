"""
API version 1 router aggregator.
"""
from api.v1.endpoints.payment import router as payment_router
from api.v1.router import api_v1_router as api_router

__all__ = ["api_router", "payment_router"]
