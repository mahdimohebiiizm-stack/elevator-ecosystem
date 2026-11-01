"""add_user_crm_and_order_logistics

Revision ID: f2c229192402
Revises: b89a8f0b03b3
Create Date: 2026-10-26 01:59:14.158515

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2c229192402'
down_revision: Union[str, Sequence[str], None] = 'b89a8f0b03b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Safely expand PostgreSQL order_status enum type
    op.execute(sa.text("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PENDING_QUOTATION'"))
    op.execute(sa.text("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PAYMENT_VERIFICATION'"))
    op.execute(sa.text("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP'"))

    # 2. Add CRM fields to users table with server default to prevent NULL constraint violation
    op.add_column('users', sa.Column('name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'name')
