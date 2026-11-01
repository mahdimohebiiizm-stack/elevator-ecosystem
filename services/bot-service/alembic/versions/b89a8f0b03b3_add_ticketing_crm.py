"""add_ticketing_crm

Revision ID: b89a8f0b03b3
Revises: 1ad882ab2d15
Create Date: 2026-10-26 00:28:14.131930

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b89a8f0b03b3'
down_revision: Union[str, Sequence[str], None] = '1ad882ab2d15'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Update ticket_status enum with 'IN_PROGRESS'
    op.execute("ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS'")

    # 2. Create ticket_priority enum
    ticket_priority_enum = sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='ticket_priority')
    ticket_priority_enum.create(op.get_bind(), checkfirst=True)

    # 3. Add priority column to tickets with default 'MEDIUM'
    op.add_column(
        'tickets',
        sa.Column('priority', ticket_priority_enum, server_default='MEDIUM', nullable=False)
    )

    # 4. Rename column 'message' to 'content' in ticket_messages
    op.alter_column('ticket_messages', 'message', new_column_name='content')

    # 5. Add is_from_admin column to ticket_messages with default False
    op.add_column(
        'ticket_messages',
        sa.Column('is_from_admin', sa.Boolean(), server_default=sa.false(), nullable=False)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('ticket_messages', 'is_from_admin')
    op.alter_column('ticket_messages', 'content', new_column_name='message')
    op.drop_column('tickets', 'priority')
    ticket_priority_enum = sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='ticket_priority')
    ticket_priority_enum.drop(op.get_bind(), checkfirst=True)
