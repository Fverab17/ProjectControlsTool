"""add change order extended fields

Revision ID: b3f7a2c9d1e8
Revises: 8492c01f2307
Create Date: 2026-06-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3f7a2c9d1e8'
down_revision: Union[str, None] = '8492c01f2307'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extend change_status with new values (PostgreSQL 12+ allows inside transaction)
    op.execute(sa.text("ALTER TYPE change_status ADD VALUE IF NOT EXISTS 'pending'"))
    op.execute(sa.text("ALTER TYPE change_status ADD VALUE IF NOT EXISTS 'cancelled'"))

    # Create the change_category enum
    op.execute(sa.text(
        "CREATE TYPE change_category AS ENUM "
        "('budget_transfer', 'scope', 'growth', 'trend')"
    ))

    # Add new columns to change_orders
    op.add_column('change_orders', sa.Column(
        'category',
        sa.Enum('budget_transfer', 'scope', 'growth', 'trend', name='change_category'),
        nullable=True,
    ))
    op.add_column('change_orders', sa.Column('issued_date',   sa.DateTime(), nullable=True))
    op.add_column('change_orders', sa.Column('approved_date', sa.DateTime(), nullable=True))
    op.add_column('change_orders', sa.Column('scope_notes',   sa.Text(),     nullable=True))


def downgrade() -> None:
    op.drop_column('change_orders', 'scope_notes')
    op.drop_column('change_orders', 'approved_date')
    op.drop_column('change_orders', 'issued_date')
    op.drop_column('change_orders', 'category')
    op.execute(sa.text("DROP TYPE IF EXISTS change_category"))
    # Note: PostgreSQL does not support removing enum values;
    # to fully roll back change_status, drop and recreate the DB.
