"""
Data access layer (Repository Pattern) exposing generic and domain-specific CRUD instances.
"""
from crud.base import CRUDBase
from crud.crud_user import CRUDUser, user

__all__ = ["CRUDBase", "CRUDUser", "user"]
