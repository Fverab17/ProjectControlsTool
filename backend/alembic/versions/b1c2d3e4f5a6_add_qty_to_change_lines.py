"""add qty to change_lines

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-06-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'b1c2d3e4f5a6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('change_lines',
        sa.Column('qty_element_id', UUID(as_uuid=True),
                  sa.ForeignKey('qty_elements.id'), nullable=True))
    op.add_column('change_lines',
        sa.Column('qty_scope_impact', sa.Numeric(18, 4), nullable=True, server_default='0'))


def downgrade() -> None:
    op.drop_column('change_lines', 'qty_scope_impact')
    op.drop_column('change_lines', 'qty_element_id')
