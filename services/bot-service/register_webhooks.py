import json
import logging
import os
import sys
from typing import Any, Dict

import httpx
from dotenv import load_dotenv

# Ensure stdout encodes UTF-8 properly on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("register_webhooks")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip().strip('"').strip("'")
BALE_BOT_TOKEN = os.getenv("BALE_BOT_TOKEN", "").strip().strip('"').strip("'")
BASE_WEBHOOK_URL = (
    os.getenv("BASE_WEBHOOK_URL", "https://stegosaur-raffle-ivory.ngrok-free.dev")
    .strip()
    .strip('"')
    .strip("'")
    .rstrip("/")
)


def register_telegram_webhook() -> Dict[str, Any]:
    """
    Registers Telegram bot webhook to receive updates at /api/v1/bot/telegram.
    """
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN is missing or empty in .env!")
        return {"ok": False, "error": "Missing TELEGRAM_BOT_TOKEN"}

    webhook_url = f"{BASE_WEBHOOK_URL}/api/v1/bot/telegram"
    endpoint = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook"
    payload = {
        "url": webhook_url,
        "drop_pending_updates": True,
        "allowed_updates": ["message", "edited_message", "callback_query"],
    }

    logger.info(f"[TELEGRAM] Registering webhook endpoint: {webhook_url}")
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(endpoint, json=payload)
            data = resp.json()
            return data
    except Exception as exc:
        logger.error(f"[TELEGRAM] Connection error while setting webhook: {exc}")
        return {"ok": False, "error": str(exc)}


def register_bale_webhook() -> Dict[str, Any]:
    """
    Registers Bale bot webhook to receive updates at /api/v1/bot/bale.
    """
    if not BALE_BOT_TOKEN:
        logger.error("BALE_BOT_TOKEN is missing or empty in .env!")
        return {"ok": False, "error": "Missing BALE_BOT_TOKEN"}

    webhook_url = f"{BASE_WEBHOOK_URL}/api/v1/bot/bale"
    endpoint = f"https://tapi.bale.ai/bot{BALE_BOT_TOKEN}/setWebhook"
    payload = {
        "url": webhook_url,
    }

    logger.info(f"[BALE] Registering webhook endpoint: {webhook_url}")
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(endpoint, json=payload)
            data = resp.json()
            return data
    except Exception as exc:
        logger.error(f"[BALE] Connection error while setting webhook: {exc}")
        return {"ok": False, "error": str(exc)}


def get_telegram_webhook_info() -> Dict[str, Any]:
    """
    Verifies current webhook status on Telegram API.
    """
    if not TELEGRAM_BOT_TOKEN:
        return {}
    endpoint = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getWebhookInfo"
    try:
        with httpx.Client(timeout=10.0) as client:
            return client.get(endpoint).json()
    except Exception:
        return {}


def main() -> None:
    print("=" * 70)
    print("ASANRO BOT OMNICHANNEL WEBHOOK REGISTRATION")
    print(f"Base Webhook URL: {BASE_WEBHOOK_URL}")
    print("=" * 70)

    # 1. Telegram Registration
    print("\n[1/2] Registering Telegram Bot Webhook...")
    tg_res = register_telegram_webhook()
    print("Telegram Response:")
    print(json.dumps(tg_res, indent=2, ensure_ascii=False))

    tg_info = get_telegram_webhook_info()
    if tg_info:
        print("\nTelegram Webhook Info:")
        print(json.dumps(tg_info, indent=2, ensure_ascii=False))

    # 2. Bale Registration
    print("\n[2/2] Registering Bale Bot Webhook...")
    bale_res = register_bale_webhook()
    print("Bale Response:")
    print(json.dumps(bale_res, indent=2, ensure_ascii=False))

    print("\n" + "=" * 70)
    tg_ok = tg_res.get("ok", False)
    bale_ok = bale_res.get("ok", False)

    if tg_ok and bale_ok:
        print(">>> SUCCESS: Both Telegram & Bale Webhooks are 100% Registered and Active! <<<")
    else:
        print(f">>> REGISTRATION STATUS: Telegram={tg_ok}, Bale={bale_ok} <<<")
    print("=" * 70)


if __name__ == "__main__":
    main()
