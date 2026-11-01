from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    """
    Shared properties for product categories.
    """

    name: str = Field(..., description="Display title of the category")
    slug: str = Field(..., description="URL-friendly unique slug identifier")
    icon_url: Optional[str] = Field(
        None, description="URL path to category iconography"
    )
    is_active: bool = Field(
        default=True, description="Whether this category is displayed to shoppers"
    )


class CategoryCreate(CategoryBase):
    """
    Payload for creating a new product category.
    """

    parent_id: Optional[uuid.UUID] = Field(
        None,
        description="Parent category UUID for nested subcategory hierarchies",
    )


class CategoryUpdate(BaseModel):
    """
    Payload for updating an existing product category.
    """

    name: Optional[str] = None
    slug: Optional[str] = None
    icon_url: Optional[str] = None
    is_active: Optional[bool] = None
    parent_id: Optional[uuid.UUID] = None


class CategoryResponse(CategoryBase):
    """
    Complete category response DTO with database timestamps and parent reference.
    """

    id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    """
    Shared properties for catalog products.
    Prices are strictly represented as integers in Iranian Rials (no float representation).
    """

    title: str = Field(..., description="Product display title")
    description: Optional[str] = Field(None, description="Detailed product description")
    price: int = Field(
        ...,
        gt=0,
        description="Unit price strictly in Iranian Rials (BigInteger)",
    )
    stock_count: int = Field(
        default=0,
        ge=0,
        description="Available inventory stock quantity",
    )
    is_active: bool = Field(
        default=True, description="Whether the product is currently purchasable"
    )


class ProductCreate(ProductBase):
    """
    Payload for creating a new catalog product.
    """

    category_id: uuid.UUID = Field(
        ..., description="Associated category UUID identifier"
    )
    sku: str = Field(..., description="Stock keeping unit unique code")


class ProductUpdate(BaseModel):
    """
    Payload for updating an existing catalog product.
    """

    category_id: Optional[uuid.UUID] = None
    sku: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = Field(
        None,
        gt=0,
        description="Updated price in Iranian Rials",
    )
    stock_count: Optional[int] = Field(
        None,
        ge=0,
        description="Updated available inventory stock quantity",
    )
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """
    Complete product response DTO with database timestamps.
    """

    id: uuid.UUID
    category_id: uuid.UUID
    sku: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminProductResponse(BaseModel):
    """
    Comprehensive product response DTO for Admin PIM portal.
    Eagerly includes nested Category to prevent N+1 queries.
    """

    id: uuid.UUID
    sku: str
    title: str
    price: int
    stock_count: int
    is_active: bool
    category_id: Optional[uuid.UUID] = None
    created_at: datetime
    category: Optional[CategoryResponse] = None

    # Enterprise PIM Attributes
    brand: Optional[str] = None
    country_of_origin: Optional[str] = None
    warranty_months: Optional[int] = None
    weight_kg: Optional[float] = None
    technical_specs: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class AdminProductCreateRequest(BaseModel):
    """
    Contract for Admin creating a new product or elevator package.
    """

    title: str = Field(..., description="Product title")
    sku: str = Field(..., description="Unique SKU code")
    price: int = Field(default=0, ge=0, description="Price in Iranian Rials")
    stock_count: int = Field(default=0, ge=0, description="Available stock quantity")
    is_active: bool = Field(default=True, description="Active status")
    category_id: Optional[uuid.UUID] = None
    description: Optional[str] = None

    # Enterprise PIM Attributes
    brand: Optional[str] = None
    country_of_origin: Optional[str] = None
    warranty_months: Optional[int] = None
    weight_kg: Optional[float] = None
    technical_specs: Optional[Dict[str, Any]] = None


class AdminProductUpdateRequest(BaseModel):
    """
    Contract for Admin modifying existing product details.
    """

    title: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[int] = Field(None, ge=0)
    stock_count: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    category_id: Optional[uuid.UUID] = None
    description: Optional[str] = None

    # Enterprise PIM Attributes
    brand: Optional[str] = None
    country_of_origin: Optional[str] = None
    warranty_months: Optional[int] = None
    weight_kg: Optional[float] = None
    technical_specs: Optional[Dict[str, Any]] = None


class ProductBulkActionRequest(BaseModel):
    product_ids: List[uuid.UUID]
    action: str = Field(..., description="Action to perform: 'deactivate', 'activate', 'delete'")


class ProductBulkActionResponse(BaseModel):
    affected_count: int
    message: str
