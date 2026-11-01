from typing import Any, Dict, List

from infrastructure.db.uow import IUnitOfWork
from schemas.order import OrderCreateRequest, OrderResponse
from services.order_service import create_order


class CreateOrderUseCase:
    """
    Application use case orchestrating order creation, stock reservation, and presentation transformation.
    """

    def __init__(self, uow: IUnitOfWork) -> None:
        self.uow = uow

    async def execute(self, request_dto: OrderCreateRequest) -> OrderResponse:
        """
        Executes order placement across the transactional boundary and returns an isolated DTO.
        """
        items_data: List[Dict[str, Any]] = [
            {"product_id": item.product_id, "quantity": item.quantity}
            for item in request_dto.items
        ]

        order = await create_order(
            session=self.uow.session,
            user_id=request_dto.user_id,
            items_data=items_data,
            address_snapshot=request_dto.address_snapshot,
        )

        return OrderResponse.model_validate(order)
