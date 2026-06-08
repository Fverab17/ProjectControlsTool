"""add etc_method to cost_accounts

Revision ID: d7b3e1f9a2c5
Revises: c4e9f2a1b3d6
Create Date: 2026-06-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd7b3e1f9a2c5'
down_revision: Union[str, None] = 'c4e9f2a1b3d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "CREATE TYPE etc_method AS ENUM "
        "('manual', 'budget_remaining', 'performance_factor', 'commitments', 'closed')"
    ))
    op.add_column(
        'cost_accounts',
        sa.Column(
            'etc_method',
            sa.Enum(
                'manual', 'budget_remaining', 'performance_factor', 'commitments', 'closed',
                name='etc_method',
            ),
            nullable=False,
            server_default='manual',
        ),
    )


def downgrade() -> None:
    op.drop_column('cost_accounts', 'etc_method')
    op.execute(sa.text("DROP TYPE etc_method"))
