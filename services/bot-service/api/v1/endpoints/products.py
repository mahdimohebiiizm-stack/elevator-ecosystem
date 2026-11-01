import logging
from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from api.deps.security import get_current_admin_user
from api.deps.uow import get_uow
from db.models.product import Category, Product
from db.models.user import User
from infrastructure.db.uow import IUnitOfWork
from schemas.product import (
    AdminProductCreateRequest,
    AdminProductResponse,
    AdminProductUpdateRequest,
    ProductBulkActionRequest,
    ProductBulkActionResponse,
)
from services.queries.product_query import list_admin_products

logger = logging.getLogger("shopbot_backend.routers.products")

router = APIRouter(prefix="/products", tags=["Products"])


@router.get(
    "",
    response_model=List[AdminProductResponse],
    status_code=status.HTTP_200_OK,
    summary="List active products for public storefront",
    description="Public endpoint (no auth required). Returns active elevator packages and parts with category info.",
)
async def get_public_products(
    skip: int = Query(0, ge=0, description="Pagination skip offset"),
    limit: int = Query(50, ge=1, le=100, description="Pagination limit"),
    uow: IUnitOfWork = Depends(get_uow),
) -> List[AdminProductResponse]:
    """
    Public storefront endpoint to fetch all active catalog products and packages.
    Eagerly loads category information to eliminate N+1 queries.
    """
    stmt = (
        select(Product)
        .where(Product.is_active == True)
        .order_by(Product.created_at.desc())
        .offset(skip)
        .limit(limit)
        .options(joinedload(Product.category))
    )
    result = await uow.session.execute(stmt)
    products = result.scalars().all()
    return list(products)


@router.get(
    "/admin/all",
    response_model=List[AdminProductResponse],
    status_code=status.HTTP_200_OK,
    summary="List all catalog products and packages for Admin PIM portal",
    description="Secured by RBAC (Admin only). Returns all elevator products, parts, and packages with eager-loaded Category.",
)
async def get_all_admin_products(
    skip: int = Query(0, ge=0, description="Pagination skip offset"),
    limit: int = Query(200, ge=1, le=500, description="Pagination limit"),
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> List[AdminProductResponse]:
    """
    Retrieves all inventory products and packages for the Admin PIM dashboard.
    Enforces Role-Based Access Control and zero N+1 query overhead.
    """
    products = await list_admin_products(
        session=uow.session,
        skip=skip,
        limit=limit,
    )
    return products


@router.post(
    "/admin",
    response_model=AdminProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new catalog product or elevator package",
    description="Secured by RBAC (Admin only). Registers product and ensures category relation.",
)
async def create_admin_product(
    payload: AdminProductCreateRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> AdminProductResponse:
    """
    Creates a new product record in the PIM database.
    """
    clean_sku = payload.sku.strip().upper()

    # 1. Check for duplicate SKU
    existing_check = await uow.session.execute(
        select(Product).where(Product.sku == clean_sku)
    )
    if existing_check.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"محصولی با شناسه SKU «{payload.sku}» قبلاً ثبت شده است.",
        )

    # 2. Resolve category
    category_id = payload.category_id
    if not category_id:
        cat_result = await uow.session.execute(select(Category).limit(1))
        default_cat = cat_result.scalar_one_or_none()
        if not default_cat:
            default_cat = Category(
                name="قطعات عمومی آسانسور",
                slug=f"general-{uuid.uuid4().hex[:6]}",
                is_active=True,
            )
            uow.session.add(default_cat)
            await uow.session.flush()
        category_id = default_cat.id

    product = Product(
        title=payload.title.strip(),
        sku=clean_sku,
        price=payload.price,
        stock_count=payload.stock_count,
        is_active=payload.is_active,
        category_id=category_id,
        description=payload.description,
        brand=payload.brand.strip() if payload.brand else None,
        country_of_origin=payload.country_of_origin.strip() if payload.country_of_origin else None,
        warranty_months=payload.warranty_months,
        weight_kg=payload.weight_kg,
        technical_specs=payload.technical_specs,
    )
    uow.session.add(product)
    await uow.commit()

    # Re-query with eager-loaded relations
    stmt = (
        select(Product)
        .where(Product.id == product.id)
        .options(joinedload(Product.category))
    )
    res = await uow.session.execute(stmt)
    return res.scalar_one()


@router.patch(
    "/admin/bulk-action",
    response_model=ProductBulkActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin bulk action on products",
    description="Secured by RBAC (Admin only). Performs bulk operations (deactivate, activate, delete) on selected products.",
)
async def admin_bulk_action_products(
    payload: ProductBulkActionRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> ProductBulkActionResponse:
    if not payload.product_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="حداقل یک محصول باید انتخاب شود.",
        )

    action = payload.action.lower().strip()
    if action not in ["deactivate", "activate", "delete"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"عملیات نامعتبر است: {payload.action}. گزینه‌های معتبر: deactivate, activate, delete",
        )

    stmt = select(Product).where(Product.id.in_(payload.product_ids))
    res = await uow.session.execute(stmt)
    products = res.scalars().all()

    if not products:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="هیچ‌یک از محصولات انتخاب شده یافت نشدند.",
        )

    affected_count = len(products)
    if action == "deactivate":
        for p in products:
            p.is_active = False
        msg = f"{affected_count} محصول با موفقیت غیرفعال شدند."
    elif action == "activate":
        for p in products:
            p.is_active = True
        msg = f"{affected_count} محصول با موفقیت فعال شدند."
    elif action == "delete":
        for p in products:
            await uow.session.delete(p)
        msg = f"{affected_count} محصول با موفقیت حذف شدند."

    await uow.commit()
    return ProductBulkActionResponse(affected_count=affected_count, message=msg)


@router.patch(
    "/admin/{product_id}",
    response_model=AdminProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Update product details by Admin",
    description="Secured by RBAC (Admin only). Updates title, SKU, price, stock, or status.",
)
async def update_admin_product(
    product_id: str,
    payload: AdminProductUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> AdminProductResponse:
    """
    Updates an existing product in the catalog.
    """
    try:
        product_uuid = uuid.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"شناسه نامعتبر است: {product_id}",
        )

    stmt = (
        select(Product)
        .where(Product.id == product_uuid)
        .options(joinedload(Product.category))
    )
    result = await uow.session.execute(stmt)
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"محصول با شناسه «{product_id}» یافت نشد.",
        )

    if payload.title is not None:
        product.title = payload.title.strip()
    if payload.sku is not None:
        product.sku = payload.sku.strip().upper()
    if payload.price is not None:
        product.price = payload.price
    if payload.stock_count is not None:
        product.stock_count = payload.stock_count
    if payload.is_active is not None:
        product.is_active = payload.is_active
    if payload.category_id is not None:
        product.category_id = payload.category_id
    if payload.description is not None:
        product.description = payload.description
    if payload.brand is not None:
        product.brand = payload.brand.strip() if payload.brand else None
    if payload.country_of_origin is not None:
        product.country_of_origin = payload.country_of_origin.strip() if payload.country_of_origin else None
    if payload.warranty_months is not None:
        product.warranty_months = payload.warranty_months
    if payload.weight_kg is not None:
        product.weight_kg = payload.weight_kg
    if payload.technical_specs is not None:
        product.technical_specs = payload.technical_specs

    await uow.commit()

    refreshed_res = await uow.session.execute(stmt)
    return refreshed_res.scalar_one()
