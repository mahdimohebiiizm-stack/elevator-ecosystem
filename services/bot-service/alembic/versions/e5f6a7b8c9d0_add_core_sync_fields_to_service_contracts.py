"""add_core_sync_fields_to_service_contracts

Revision ID: e5f6a7b8c9d0
Revises: ab3204905ccb
Create Date: 2026-11-01 06:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'ab3204905ccb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add Core API sync and management fields to service_contracts."""
    op.add_column('service_contracts', sa.Column('manager_name', sa.String(length=255), nullable=True))
    op.add_column('service_contracts', sa.Column('manager_phone', sa.String(length=50), nullable=True))
    op.add_column('service_contracts', sa.Column('contract_number', sa.String(length=100), nullable=True))
    op.add_column('service_contracts', sa.Column('core_building_id', sa.Uuid(), nullable=True))
    op.add_column('service_contracts', sa.Column('core_elevator_id', sa.Uuid(), nullable=True))
    op.add_column('service_contracts', sa.Column('core_contract_id', sa.Uuid(), nullable=True))
    op.add_column('service_contracts', sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('service_contracts', sa.Column('sync_status', sa.String(length=50), server_default='NOT_SYNCED', nullable=True))
    op.add_column('service_contracts', sa.Column('sync_error', sa.Text(), nullable=True))
    op.create_index(op.f('ix_service_contracts_contract_number'), 'service_contracts', ['contract_number'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_service_contracts_contract_number'), table_name='service_contracts')
    op.drop_column('service_contracts', 'sync_error')
    op.drop_column('service_contracts', 'sync_status')
    op.drop_column('service_contracts', 'synced_at')
    op.drop_column('service_contracts', 'core_contract_id')
    op.drop_column('service_contracts', 'core_elevator_id')
    op.drop_column('service_contracts', 'core_building_id')
    op.drop_column('service_contracts', 'contract_number')
    op.drop_column('service_contracts', 'manager_phone')
    op.drop_column('service_contracts', 'manager_name')
