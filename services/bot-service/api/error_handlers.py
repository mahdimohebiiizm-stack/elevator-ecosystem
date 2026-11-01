"""
Re-export module for centralized RFC 7807 error handlers.
"""
from infrastructure.web.error_handlers import (
    create_rfc7807_problem_response,
    register_error_handlers,
)

__all__ = ["create_rfc7807_problem_response", "register_error_handlers"]
