import httpx
import pytest

from core.exceptions import PaymentProviderError
from services.payment.zarinpal import ZarinPalGateway


@pytest.mark.asyncio
async def test_zarinpal_request_payment_success() -> None:
    """
    Test successful payment session creation generating authority and redirect URL.
    """

    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "data": {
                    "code": 100,
                    "message": "Success",
                    "authority": "A00000000000000000000000000000000001",
                    "fee": 50000,
                },
                "errors": [],
            },
        )

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))
    gateway = ZarinPalGateway(http_client=mock_client)

    result = await gateway.request_payment(
        amount=10_000_000,  # 10 Million Rials
        callback_url="http://localhost:8000/callback",
        description="Test payment",
    )

    assert result.authority == "A00000000000000000000000000000000001"
    assert "StartPay" in result.payment_url
    assert result.fee == 50000
    await mock_client.aclose()


@pytest.mark.asyncio
async def test_zarinpal_request_payment_invalid_amount() -> None:
    """
    Test that requesting payment with zero or negative amount raises PaymentProviderError.
    """
    gateway = ZarinPalGateway()
    with pytest.raises(PaymentProviderError) as exc_info:
        await gateway.request_payment(
            amount=0,
            callback_url="http://localhost:8000/callback",
            description="Test payment",
        )
    assert "Invalid payment amount" in str(exc_info.value)


@pytest.mark.asyncio
async def test_zarinpal_request_payment_error_mapping() -> None:
    """
    Test that ZarinPal error codes (e.g. -10, -9) map to domain PaymentProviderError.
    """

    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "data": {"code": -10, "message": "Terminal is not valid"},
                "errors": {"code": -10, "message": "Terminal is not valid"},
            },
        )

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))
    gateway = ZarinPalGateway(http_client=mock_client)

    with pytest.raises(PaymentProviderError) as exc_info:
        await gateway.request_payment(
            amount=5_000_000,
            callback_url="http://localhost:8000/callback",
            description="Test payment",
        )
    assert "Terminal is not valid" in str(exc_info.value)
    await mock_client.aclose()


@pytest.mark.asyncio
async def test_zarinpal_verify_payment_success_and_idempotency() -> None:
    """
    Test that verify_payment handles code 100 (Success) and 101 (Already Verified).
    """

    # Code 100
    def mock_100_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "data": {
                    "code": 100,
                    "ref_id": 987654321,
                    "card_pan": "502229******1234",
                    "fee": 0,
                },
                "errors": [],
            },
        )

    client_100 = httpx.AsyncClient(transport=httpx.MockTransport(mock_100_handler))
    gateway_100 = ZarinPalGateway(http_client=client_100)

    res_100 = await gateway_100.verify_payment(
        amount=10_000_000,
        authority="A00000000000000000000000000000000001",
    )
    assert res_100.is_success is True
    assert res_100.ref_id == "987654321"
    assert res_100.code == 100
    await client_100.aclose()

    # Code 101 (Already verified)
    def mock_101_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "data": {
                    "code": 101,
                    "ref_id": 987654321,
                    "card_pan": "502229******1234",
                    "fee": 0,
                },
                "errors": [],
            },
        )

    client_101 = httpx.AsyncClient(transport=httpx.MockTransport(mock_101_handler))
    gateway_101 = ZarinPalGateway(http_client=client_101)

    res_101 = await gateway_101.verify_payment(
        amount=10_000_000,
        authority="A00000000000000000000000000000000001",
    )
    assert res_101.is_success is True
    assert res_101.ref_id == "987654321"
    assert res_101.code == 101
    await client_101.aclose()
