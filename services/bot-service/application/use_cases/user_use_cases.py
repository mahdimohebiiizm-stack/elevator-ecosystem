from infrastructure.db.uow import IUnitOfWork
from schemas.user import BotAuthRequest, UserResponse
from services.user_service import authenticate_bot_user


class AuthenticateBotUserUseCase:
    """
    Application use case orchestrating messenger user authentication and provisioning.
    """

    def __init__(self, uow: IUnitOfWork) -> None:
        self.uow = uow

    async def execute(self, request_dto: BotAuthRequest) -> UserResponse:
        """
        Executes bot authentication and transforms database entity into presentation DTO.
        """
        user = await authenticate_bot_user(
            session=self.uow.session,
            messenger_id=request_dto.messenger_id,
            phone=request_dto.phone,
        )

        return UserResponse.model_validate(user)
