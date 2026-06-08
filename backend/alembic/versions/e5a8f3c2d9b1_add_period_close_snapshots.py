"""add period-close snapshots to cost_account_periods

Revision ID: e5a8f3c2d9b1
Revises: d7b3e1f9a2c5
Create Date: 2026-06-08

Adds five snapshot columns that are populated when a period is closed.
These capture the forecast state (ETC, EAC, % complete, cumulative EV,
cumulative AC) as it stood at period close, enabling true historical
period views and EAC trend charting.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5a8f3c2d9b1'
down_revision: Union[str, None] = 'd7b3e1f9a2c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cost_account_periods', sa.Column('snap_pct_complete',        sa.Numeric(6,  4), nullable=True))
    op.add_column('cost_account_periods', sa.Column('snap_cost_earned',         sa.Numeric(18, 2), nullable=True))
    op.add_column('cost_account_periods', sa.Column('snap_cost_actual_to_date', sa.Numeric(18, 2), nullable=True))
    op.add_column('cost_account_periods', sa.Column('snap_cost_etc',            sa.Numeric(18, 2), nullable=True))
    op.add_column('cost_account_periods', sa.Column('snap_cost_eac',            sa.Numeric(18, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('cost_account_periods', 'snap_cost_eac')
    op.drop_column('cost_account_periods', 'snap_cost_etc')
    op.drop_column('cost_account_periods', 'snap_cost_actual_to_date')
    op.drop_column('cost_account_periods', 'snap_cost_earned')
    op.drop_column('cost_account_periods', 'snap_pct_complete')
