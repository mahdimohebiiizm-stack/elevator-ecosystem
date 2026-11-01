import asyncio
from datetime import date, datetime, timedelta, timezone
import logging
import os
import re
from typing import Any, Dict, Optional, Union
import uuid

import httpx

from core.config import settings
from db.models.contract import ContractStatus, ServiceContract

logger = logging.getLogger("shopbot_backend.services.core_sync")


class CoreSyncService:
    """
    Enterprise Data Synchronization Service between Web Portal (shopbot_db)
    and the Operational Mobile App Core Service (core-api).
    Decoupled REST Bridge using HTTP client (httpx) to eliminate direct database coupling.
    """

    BASE_URL: str = os.getenv(
        "CORE_API_BASE_URL",
        getattr(settings, "CORE_API_BASE_URL", "http://core_api:8000/api/v1"),
    ).rstrip("/")

    DEFAULT_AUTH_TOKEN: str = os.getenv(
        "CORE_API_AUTH_TOKEN",
        "Bearer internal_service_super_secret",
    )

    @staticmethod
    def extract_speed_float(speed_val: Optional[Union[str, float, int]]) -> float:
        """
        Regex helper method to extract float value from elevator speed representations.
        Examples:
            '1.0 m/s'  -> 1.0
            '1.6'      -> 1.6
            '0.75 m/s' -> 0.75
            2          -> 2.0
            None       -> 1.0 (Enterprise Default)
        """
        if speed_val is None:
            return 1.0
        if isinstance(speed_val, (int, float)):
            return float(speed_val)

        match = re.search(r"(\d+(?:\.\d+)?)", str(speed_val))
        if match:
            try:
                return float(match.group(1))
            except (ValueError, TypeError):
                return 1.0
        return 1.0

    @staticmethod
    def format_iso_date(
        dt_val: Optional[Union[datetime, date, str]],
        fallback_dt: Optional[Union[datetime, date]] = None,
    ) -> Optional[str]:
        """
        Normalizes datetime, date or string inputs to ISO format string (YYYY-MM-DD).
        """
        target = dt_val if dt_val is not None else fallback_dt
        if target is None:
            return None
        if isinstance(target, datetime):
            return target.date().isoformat()
        if isinstance(target, date):
            return target.isoformat()
        if isinstance(target, str):
            clean = target.strip().split("T")[0]
            if re.match(r"^\d{4}-\d{2}-\d{2}$", clean):
                return clean
        return None

    @classmethod
    async def _commit_session(cls, session: Any) -> None:
        """
        Safely commits active database session whether it is AsyncSession or UnitOfWork.
        """
        if session is None:
            return
        if hasattr(session, "commit"):
            res = session.commit()
            if asyncio.iscoroutine(res):
                await res

    @classmethod
    async def sync_contract_to_core(
        cls,
        contract: ServiceContract,
        session: Any = None,
    ) -> Dict[str, Any]:
        """
        Pushes ServiceContract data from shopbot_db into core-api via decoupled REST Bridge.
        
        Execution Lifecycle:
          Step 1: POST to /buildings/ -> returns core_building_id
          Step 2: POST to /buildings/{core_building_id}/elevators -> returns core_elevator_id
          Step 3: POST to /contracts/ -> returns core_contract_id
          Step 4: Update contract model, set sync_status='SYNCED', and commit session.
        
        Fault-tolerance:
          Catches all network and serialization errors, sets sync_status='FAILED',
          persists error details to sync_error, and does NOT crash the application.
        """
        logger.info(
            f"Initiating decoupled REST sync for ServiceContract {contract.id} to Core API at {cls.BASE_URL}"
        )

        headers = {
            "Authorization": cls.DEFAULT_AUTH_TOKEN,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            # ------------------------------------------------------------------
            # 1. DATA NORMALIZATION
            # ------------------------------------------------------------------
            # Building Information Normalization
            b_name = (
                contract.building_name.strip()
                if contract.building_name and contract.building_name.strip()
                else f"ساختمان {contract.building_address[:30].strip() if contract.building_address else 'مرکزی'}"
            )
            b_address = contract.building_address.strip() if contract.building_address else None
            b_postal = contract.postal_code.strip() if contract.postal_code else None
            b_plate = contract.registration_plate.strip() if contract.registration_plate else None

            user_obj = getattr(contract, "user", None)
            b_mgr_name = (
                contract.manager_name.strip()
                if contract.manager_name and contract.manager_name.strip()
                else (user_obj.name.strip() if user_obj and user_obj.name else "کارفرمای سامانه")
            )
            b_mgr_national = (
                contract.employer_national_id.strip() if contract.employer_national_id else None
            )
            b_mgr_phone = (
                contract.manager_phone.strip()
                if contract.manager_phone
                else (user_obj.phone.strip() if user_obj and user_obj.phone else None)
            )

            # Elevator Information Normalization
            elv_type = contract.elevator_type.strip() if contract.elevator_type else "کششی"
            elv_stops = int(contract.stops_count) if contract.stops_count is not None else 5
            elv_capacity = int(contract.capacity_kg) if contract.capacity_kg else 600
            elv_speed = cls.extract_speed_float(contract.speed_ms)
            elv_usage = contract.usage_type.strip() if contract.usage_type else "مسافری"
            elv_qr = (
                contract.qr_code_hash.strip()
                if contract.qr_code_hash
                else f"ELV-{uuid.uuid4().hex[:8].upper()}"
            )

            # Contract & Financial Normalization
            c_number = (
                contract.contract_number.strip()
                if contract.contract_number
                else f"CRT-{str(contract.id)[:8].upper()}"
            )
            total_amount = float(contract.annual_price or 0.0)
            monthly_fee = float(
                contract.monthly_fee
                if contract.monthly_fee is not None and contract.monthly_fee > 0
                else (total_amount / 12.0 if total_amount > 0 else 0.0)
            )

            # Dates Normalization (ISO YYYY-MM-DD)
            now_utc = datetime.now(timezone.utc)
            start_date_str = cls.format_iso_date(contract.start_date, fallback_dt=now_utc)
            end_date_str = cls.format_iso_date(
                contract.end_date,
                fallback_dt=(now_utc + timedelta(days=365)),
            )

            # Status Normalization
            if contract.status == ContractStatus.ACTIVE:
                core_status = "ACTIVE"
            elif contract.status == ContractStatus.QUOTED:
                core_status = "QUOTED"
            elif contract.status == ContractStatus.REJECTED:
                core_status = "CANCELED"
            elif contract.status == ContractStatus.EXPIRED:
                core_status = "EXPIRED"
            else:
                core_status = "PENDING"

            # Payment Frequency Normalization
            freq_raw = str(contract.payment_frequency or "FLEXIBLE").upper()
            if "MONTHLY" in freq_raw:
                core_freq = "MONTHLY"
            elif "QUARTERLY" in freq_raw:
                core_freq = "QUARTERLY"
            else:
                core_freq = "FLEXIBLE"

            # ------------------------------------------------------------------
            # 2. HTTP REST CLIENT EXECUTION
            # ------------------------------------------------------------------
            async with httpx.AsyncClient(
                base_url=cls.BASE_URL,
                headers=headers,
                timeout=httpx.Timeout(15.0, connect=5.0),
            ) as client:
                # Step 1: POST /buildings/
                building_payload = {
                    "name": b_name,
                    "address": b_address,
                    "postal_code": b_postal,
                    "registration_plate": b_plate,
                    "manager_name": b_mgr_name,
                    "manager_national_id": b_mgr_national,
                    "manager_phone": b_mgr_phone,
                }
                logger.debug(f"Sync Step 1: POST /buildings/ with {building_payload}")
                resp_bld = await client.post("/buildings/", json=building_payload)
                resp_bld.raise_for_status()
                bld_data = resp_bld.json()
                core_building_id_raw = bld_data.get("id")
                if not core_building_id_raw:
                    raise ValueError(f"Core API building response missing 'id': {bld_data}")
                core_building_id = uuid.UUID(str(core_building_id_raw))

                # Step 2: POST /buildings/{building_id}/elevators
                elevator_payload = {
                    "type": elv_type,
                    "stops": elv_stops,
                    "capacity_kg": elv_capacity,
                    "speed_ms": elv_speed,
                    "usage_type": elv_usage,
                    "qr_code_hash": elv_qr,
                }
                logger.debug(
                    f"Sync Step 2: POST /buildings/{core_building_id}/elevators with {elevator_payload}"
                )
                resp_elv = await client.post(
                    f"/buildings/{core_building_id}/elevators",
                    json=elevator_payload,
                )
                resp_elv.raise_for_status()
                elv_data = resp_elv.json()
                core_elevator_id_raw = elv_data.get("id")
                if not core_elevator_id_raw:
                    raise ValueError(f"Core API elevator response missing 'id': {elv_data}")
                core_elevator_id = uuid.UUID(str(core_elevator_id_raw))

                # Step 3: POST /contracts/
                contract_payload = {
                    "building_id": str(core_building_id),
                    "contract_number": c_number,
                    "employer_name": b_mgr_name,
                    "employer_national_id": b_mgr_national,
                    "employer_phone": b_mgr_phone,
                    "total_amount": total_amount,
                    "monthly_fee": monthly_fee,
                    "start_date": start_date_str,
                    "end_date": end_date_str,
                    "status": core_status,
                    "payment_frequency": core_freq,
                }
                logger.debug(f"Sync Step 3: POST /contracts/ with {contract_payload}")
                resp_ctr = await client.post("/contracts/", json=contract_payload)
                resp_ctr.raise_for_status()
                ctr_data = resp_ctr.json()
                core_contract_id_raw = ctr_data.get("id")
                if not core_contract_id_raw:
                    raise ValueError(f"Core API contract response missing 'id': {ctr_data}")
                core_contract_id = uuid.UUID(str(core_contract_id_raw))

            # ------------------------------------------------------------------
            # 3. SUCCESS STATE UPDATE & COMMIT
            # ------------------------------------------------------------------
            contract.core_building_id = core_building_id
            contract.core_elevator_id = core_elevator_id
            contract.core_contract_id = core_contract_id
            contract.contract_number = c_number
            contract.qr_code_hash = elv_qr
            contract.synced_at = datetime.now(timezone.utc)
            contract.sync_status = "SYNCED"
            contract.sync_error = None

            if session is not None:
                await cls._commit_session(session)

            logger.info(
                f"Successfully synced ServiceContract {contract.id} to Core API via REST! "
                f"CoreBuilding: {core_building_id}, CoreElevator: {core_elevator_id}, CoreContract: {core_contract_id}"
            )

            return {
                "success": True,
                "core_building_id": str(core_building_id),
                "core_elevator_id": str(core_elevator_id),
                "core_contract_id": str(core_contract_id),
                "contract_number": c_number,
                "synced_at": contract.synced_at.isoformat(),
                "sync_status": "SYNCED",
                "error": None,
            }

        except httpx.HTTPStatusError as http_err:
            error_msg = (
                f"Core API HTTP {http_err.response.status_code} "
                f"[{http_err.request.method} {http_err.request.url}]: {http_err.response.text}"
            )
            logger.error(f"Sync failed for ServiceContract {contract.id}: {error_msg}")
            contract.sync_status = "FAILED"
            contract.sync_error = error_msg
            if session is not None:
                try:
                    await cls._commit_session(session)
                except Exception as commit_err:
                    logger.error(f"Failed to commit FAILED sync status: {commit_err}")
            return {
                "success": False,
                "sync_status": "FAILED",
                "error": error_msg,
            }

        except httpx.RequestError as req_err:
            error_msg = f"Network connection error to Core API ({req_err.request.url}): {str(req_err)}"
            logger.error(f"Sync connection failed for ServiceContract {contract.id}: {error_msg}")
            contract.sync_status = "FAILED"
            contract.sync_error = error_msg
            if session is not None:
                try:
                    await cls._commit_session(session)
                except Exception as commit_err:
                    logger.error(f"Failed to commit FAILED sync status: {commit_err}")
            return {
                "success": False,
                "sync_status": "FAILED",
                "error": error_msg,
            }

        except Exception as exc:
            error_msg = f"Data or execution error during Core API REST sync: {type(exc).__name__}: {str(exc)}"
            logger.error(f"Unexpected sync failure for ServiceContract {contract.id}: {error_msg}", exc_info=True)
            contract.sync_status = "FAILED"
            contract.sync_error = error_msg
            if session is not None:
                try:
                    await cls._commit_session(session)
                except Exception as commit_err:
                    logger.error(f"Failed to commit FAILED sync status: {commit_err}")
            return {
                "success": False,
                "sync_status": "FAILED",
                "error": error_msg,
            }
