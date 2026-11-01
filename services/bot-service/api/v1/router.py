from fastapi import APIRouter

from api.v1.endpoints.cms import router as cms_router
from api.v1.endpoints.orders import router as orders_router
from api.v1.endpoints.payment import router as payment_router
from api.v1.endpoints.products import router as products_router
from api.v1.endpoints.tickets import router as tickets_router
from api.v1.endpoints.notifications import router as notifications_router
from api.v1.endpoints.contracts import router as contracts_router
from api.v1.endpoints.users import router as users_router
from api.v1.endpoints.webhooks import router as webhooks_router
from api.v1.endpoints.bot import router as bot_router
from api.v1.endpoints.admin import router as admin_router

api_v1_router = APIRouter()

api_v1_router.include_router(webhooks_router)
api_v1_router.include_router(bot_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(payment_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(cms_router)
api_v1_router.include_router(tickets_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(contracts_router)
