"""add period_reports table

Revision ID: f1a2b3c4d5e6
Revises: e5a8f3c2d9b1
Create Date: 2026-06-08

One row per project per period capturing the period status narrative,
risks summary, and learnings — the period status report.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e5a8f3c2d9b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'period_reports',
        sa.Column('id',                 sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id',         sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('period_code',        sa.Text, nullable=False),
        sa.Column('status_color',       sa.Text, nullable=False, server_default='green'),
        sa.Column('status_narrative',   sa.Text),
        sa.Column('risks_narrative',    sa.Text),
        sa.Column('learnings_narrative', sa.Text),
        sa.Column('created_at',         sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at',         sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('project_id', 'period_code', name='uq_period_reports_project_period'),
    )


def downgrade() -> None:
    op.drop_table('period_reports')
