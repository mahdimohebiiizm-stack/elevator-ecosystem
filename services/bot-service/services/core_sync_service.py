import logging
import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import asyncpg
from core.config import settings
from db.models.contract import ContractStatus, ServiceContract

logger = logging.getLogger("shopbot_backend.services.core_sync")


class CoreSyncService:
    """
    Enterprise Data Synchronization Service between Web Portal (shopbot_db)
    and the Operational Mobile App Core Database (elevator_db).
    Guarantees 1:1 idempotent synchronization for Buildings, Elevators, and Contracts.
    """

    @staticmethod
    def _get_raw_asyncpg_dsn(url: str) -> str:
        """Strips SQLAlchemy dialect prefixes for raw asyncpg connection."""
        if url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql+asyncpg://", "postgresql://", 1)
        return url

    @classmethod
    async def sync_contract_to_core(
        cls,
        contract: ServiceContract,
        session: Any = None,
    ) -> Dict[str, Any]:
        """
        Idempotently pushes ServiceContract data from shopbot_db into elevator_db.
        Updates Building, Elevator, and Contract entities in elevator_db,
        and saves foreign key linkages (core_building_id, core_elevator_id, core_contract_id)
        back into shopbot_db.service_contracts.
        """
        dsn = cls._get_raw_asyncpg_dsn(settings.CORE_DATABASE_URL)
        logger.info(
            f"Initiating Core DB sync for ServiceContract {contract.id} to {dsn.split('@')[-1]}"
        )

        try:
            conn = await asyncpg.connect(dsn)
        except Exception as e:
            error_msg = f"Failed to connect to Core App Database (elevator_db): {str(e)}"
            logger.error(error_msg)
            contract.sync_status = "FAILED"
            contract.sync_error = error_msg
            if session:
                await session.flush()
            raise RuntimeError(error_msg) from e

        try:
            async with conn.transaction():
                # -------------------------------------------------------------
                # 1. UPSERT BUILDING in elevator_db
                # -------------------------------------------------------------
                b_name = (
                    contract.building_name.strip()
                    if contract.building_name
                    else f"ساختمان {contract.building_address[:30].strip()}"
                )
                b_address = contract.building_address.strip()
                b_postal = (
                    contract.postal_code.strip() if contract.postal_code else None
                )
                b_plate = (
                    contract.registration_plate.strip()
                    if contract.registration_plate
                    else None
                )
                b_mgr_name = (
                    contract.manager_name.strip()
                    if contract.manager_name
                    else (contract.user.name if contract.user and contract.user.name else "کارفرمای سامانه")
                )
                b_mgr_national = (
                    contract.employer_national_id.strip()
                    if contract.employer_national_id
                    else None
                )
                b_mgr_phone = (
                    contract.manager_phone.strip()
                    if contract.manager_phone
                    else (contract.user.phone if contract.user and contract.user.phone else None)
                )

                building_id: Optional[uuid.UUID] = None

                if contract.core_building_id:
                    row = await conn.fetchrow(
                        "SELECT id FROM buildings WHERE id = $1 AND is_deleted = false",
                        contract.core_building_id,
                    )
                    if row:
                        building_id = row["id"]

                # If not found by core_building_id, check by registration plate or name
                if not building_id:
                    if b_plate:
                        row = await conn.fetchrow(
                            "SELECT id FROM buildings WHERE registration_plate = $1 AND is_deleted = false LIMIT 1",
                            b_plate,
                        )
                        if row:
                            building_id = row["id"]

                    if not building_id and b_name:
                        row = await conn.fetchrow(
                            "SELECT id FROM buildings WHERE name = $1 AND is_deleted = false LIMIT 1",
                            b_name,
                        )
                        if row:
                            building_id = row["id"]

                if building_id:
                    # Update existing building
                    await conn.execute(
                        """
                        UPDATE buildings
                        SET name = $1, address = $2, postal_code = $3, registration_plate = $4,
                            manager_name = $5, manager_national_id = $6, manager_phone = $7
                        WHERE id = $8
                        """,
                        b_name,
                        b_address,
                        b_postal,
                        b_plate,
                        b_mgr_name,
                        b_mgr_national,
                        b_mgr_phone,
                        building_id,
                    )
                else:
                    # Insert new building
                    building_id = uuid.uuid4()
                    await conn.execute(
                        """
                        INSERT INTO buildings (
                            id, name, address, postal_code, registration_plate,
                            manager_name, manager_national_id, manager_phone, is_deleted
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
                        """,
                        building_id,
                        b_name,
                        b_address,
                        b_postal,
                        b_plate,
                        b_mgr_name,
                        b_mgr_national,
                        b_mgr_phone,
                    )

                # -------------------------------------------------------------
                # 2. UPSERT ELEVATOR in elevator_db
                # -------------------------------------------------------------
                elv_type = contract.elevator_type.strip()
                elv_stops = int(contract.stops_count)
                elv_capacity = int(contract.capacity_kg) if contract.capacity_kg else 600

                # Parse float speed from speed_ms (e.g., '1.0 m/s' -> 1.0)
                speed_str = str(contract.speed_ms or "1.0")
                match = re.search(r"(\d+(?:\.\d+)?)", speed_str)
                elv_speed = float(match.group(1)) if match else 1.0

                elv_usage = (
                    contract.usage_type.strip() if contract.usage_type else "مسافری"
                )
                elv_qr = (
                    contract.qr_code_hash.strip()
                    if contract.qr_code_hash
                    else f"ELV-{uuid.uuid4().hex[:8].upper()}"
                )

                elevator_id: Optional[uuid.UUID] = None

                if contract.core_elevator_id:
                    row = await conn.fetchrow(
                        "SELECT id FROM elevators WHERE id = $1",
                        contract.core_elevator_id,
                    )
                    if row:
                        elevator_id = row["id"]

                if not elevator_id:
                    # Check by qr_code_hash or building_id
                    row = await conn.fetchrow(
                        "SELECT id FROM elevators WHERE qr_code_hash = $1 LIMIT 1",
                        elv_qr,
                    )
                    if row:
                        elevator_id = row["id"]
                    else:
                        row = await conn.fetchrow(
                            "SELECT id FROM elevators WHERE building_id = $1 LIMIT 1",
                            building_id,
                        )
                        if row:
                            elevator_id = row["id"]

                if elevator_id:
                    # Update existing elevator
                    await conn.execute(
                        """
                        UPDATE elevators
                        SET building_id = $1, type = $2, stops = $3, capacity_kg = $4,
                            speed_ms = $5, usage_type = $6, qr_code_hash = $7
                        WHERE id = $8
                        """,
                        building_id,
                        elv_type,
                        elv_stops,
                        elv_capacity,
                        elv_speed,
                        elv_usage,
                        elv_qr,
                        elevator_id,
                    )
                else:
                    # Insert new elevator
                    elevator_id = uuid.uuid4()
                    await conn.execute(
                        """
                        INSERT INTO elevators (
                            id, building_id, type, stops, capacity_kg,
                            speed_ms, usage_type, qr_code_hash
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        """,
                        elevator_id,
                        building_id,
                        elv_type,
                        elv_stops,
                        elv_capacity,
                        elv_speed,
                        elv_usage,
                        elv_qr,
                    )

                # -------------------------------------------------------------
                # 3. UPSERT CONTRACT in elevator_db
                # -------------------------------------------------------------
                c_number = (
                    contract.contract_number.strip()
                    if contract.contract_number
                    else f"CRT-{str(contract.id)[:8]}"
                )

                # Map status Enum to elevator_db contractstatusenum
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

                # Map payment frequency Enum to paymentfrequencyenum
                freq_raw = (contract.payment_frequency or "FLEXIBLE").upper()
                if "MONTHLY" in freq_raw:
                    core_freq = "MONTHLY"
                elif "QUARTERLY" in freq_raw:
                    core_freq = "QUARTERLY"
                else:
                    core_freq = "FLEXIBLE"

                total_amount = float(contract.annual_price or 0.0)
                monthly_fee = float(
                    contract.monthly_fee
                    if contract.monthly_fee is not None and contract.monthly_fee > 0
                    else (total_amount / 12 if total_amount > 0 else 0.0)
                )
                total_debt = float(contract.total_debt or 0.0)

                start_date = (
                    contract.start_date.date()
                    if contract.start_date
                    else datetime.utcnow().date()
                )
                end_date = (
                    contract.end_date.date()
                    if contract.end_date
                    else (start_date + timedelta(days=365))
                )

                core_contract_id: Optional[uuid.UUID] = None

                if contract.core_contract_id:
                    row = await conn.fetchrow(
                        "SELECT id FROM contracts WHERE id = $1",
                        contract.core_contract_id,
                    )
                    if row:
                        core_contract_id = row["id"]

                if not core_contract_id:
                    # Check by contract_number or building_id
                    row = await conn.fetchrow(
                        "SELECT id FROM contracts WHERE contract_number = $1 LIMIT 1",
                        c_number,
                    )
                    if row:
                        core_contract_id = row["id"]
                    else:
                        row = await conn.fetchrow(
                            "SELECT id FROM contracts WHERE building_id = $1 LIMIT 1",
                            building_id,
                        )
                        if row:
                            core_contract_id = row["id"]

                if core_contract_id:
                    # Update existing contract in elevator_db
                    await conn.execute(
                        """
                        UPDATE contracts
                        SET building_id = $1, contract_number = $2, employer_name = $3,
                            employer_national_id = $4, employer_phone = $5, start_date = $6,
                            end_date = $7, total_amount = $8, monthly_fee = $9, total_debt = $10,
                            status = $11, payment_frequency = $12
                        WHERE id = $13
                        """,
                        building_id,
                        c_number,
                        b_mgr_name,
                        b_mgr_national,
                        b_mgr_phone,
                        start_date,
                        end_date,
                        total_amount,
                        monthly_fee,
                        total_debt,
                        core_status,
                        core_freq,
                        core_contract_id,
                    )
                else:
                    # Insert new contract in elevator_db
                    core_contract_id = uuid.uuid4()
                    await conn.execute(
                        """
                        INSERT INTO contracts (
                            id, building_id, contract_number, employer_name, employer_national_id,
                            employer_phone, start_date, end_date, total_amount, monthly_fee,
                            total_debt, status, payment_frequency, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                        """,
                        core_contract_id,
                        building_id,
                        c_number,
                        b_mgr_name,
                        b_mgr_national,
                        b_mgr_phone,
                        start_date,
                        end_date,
                        total_amount,
                        monthly_fee,
                        total_debt,
                        core_status,
                        core_freq,
                        datetime.utcnow(),
                    )

            # -------------------------------------------------------------
            # 4. UPDATE shopbot_db METADATA
            # -------------------------------------------------------------
            contract.core_building_id = building_id
            contract.core_elevator_id = elevator_id
            contract.core_contract_id = core_contract_id
            contract.contract_number = c_number
            contract.qr_code_hash = elv_qr
            contract.synced_at = datetime.utcnow()
            contract.sync_status = "SYNCED"
            contract.sync_error = None

            if session:
                await session.flush()

            logger.info(
                f"Successfully synced ServiceContract {contract.id} to Core DB! "
                f"CoreBuilding: {building_id}, CoreElevator: {elevator_id}, CoreContract: {core_contract_id}"
            )

            return {
                "success": True,
                "core_building_id": str(building_id),
                "core_elevator_id": str(elevator_id),
                "core_contract_id": str(core_contract_id),
                "contract_number": c_number,
                "synced_at": contract.synced_at.isoformat(),
                "sync_status": "SYNCED",
            }

        except Exception as e:
            error_msg = f"Database error during Core DB transaction: {str(e)}"
            logger.error(error_msg, exc_info=True)
            contract.sync_status = "FAILED"
            contract.sync_error = error_msg
            if session:
                await session.flush()
            raise RuntimeError(error_msg) from e
        finally:
            await conn.close()
