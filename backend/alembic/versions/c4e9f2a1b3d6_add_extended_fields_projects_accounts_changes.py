"""add extended fields to projects, cost_accounts, change_orders

Revision ID: c4e9f2a1b3d6
Revises: b3f7a2c9d1e8
Create Date: 2026-06-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID


revision: str = 'c4e9f2a1b3d6'
down_revision: Union[str, None] = 'b3f7a2c9d1e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # New enums
    # ------------------------------------------------------------------
    op.execute(sa.text(
        "CREATE TYPE project_status AS ENUM "
        "('active', 'on_hold', 'closed', 'cancelled', 'completed')"
    ))
    op.execute(sa.text(
        "CREATE TYPE project_type AS ENUM ('capex', 'opex', 'abex')"
    ))

    # ------------------------------------------------------------------
    # projects — classification, ownership, approved dates, extra rollups
    # ------------------------------------------------------------------
    op.add_column('projects', sa.Column('project_status',
        sa.Enum('active', 'on_hold', 'closed', 'cancelled', 'completed',
                name='project_status'),
        nullable=True))
    op.add_column('projects', sa.Column('is_closed',
        sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('projects', sa.Column('project_type',
        sa.Enum('capex', 'opex', 'abex', name='project_type'),
        nullable=True))
    op.add_column('projects', sa.Column('region',        sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('asset',         sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('sponsor',       sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('pm_name',       sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('controls_lead', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('scope_of_work', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('notes',         sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('approved_start',  sa.DateTime(), nullable=True))
    op.add_column('projects', sa.Column('approved_finish', sa.DateTime(), nullable=True))
    op.add_column('projects', sa.Column('cost_ac_variance',
        sa.Numeric(18, 2), nullable=True))
    op.add_column('projects', sa.Column('budget_remain',
        sa.Numeric(18, 2), nullable=True))

    # ------------------------------------------------------------------
    # cost_accounts — approved dates, extended hour set, EAC review,
    #                 AC variance, primary vendor, approved curve, notes
    # ------------------------------------------------------------------
    op.add_column('cost_accounts', sa.Column('approved_curve_id',
        PGUUID(as_uuid=True), nullable=True))
    op.add_column('cost_accounts', sa.Column('vendor_id',
        PGUUID(as_uuid=True), nullable=True))
    op.add_column('cost_accounts', sa.Column('approved_start',  sa.DateTime(), nullable=True))
    op.add_column('cost_accounts', sa.Column('approved_finish', sa.DateTime(), nullable=True))
    op.add_column('cost_accounts', sa.Column('pct_complete_prev',
        sa.Numeric(6, 4), nullable=True))
    op.add_column('cost_accounts', sa.Column('pct_complete_proposed',
        sa.Numeric(6, 4), nullable=True))
    op.add_column('cost_accounts', sa.Column('pct_complete_adjusted',
        sa.Numeric(6, 4), nullable=True))
    op.add_column('cost_accounts', sa.Column('cost_eac_proposed',
        sa.Numeric(18, 2), nullable=True))
    op.add_column('cost_accounts', sa.Column('cost_eac_adjusted',
        sa.Numeric(18, 2), nullable=True))
    op.add_column('cost_accounts', sa.Column('cost_ac_variance',
        sa.Numeric(18, 2), nullable=True))
    op.add_column('cost_accounts', sa.Column('hour_incurred',
        sa.Numeric(18, 2), nullable=True))
    op.add_column('cost_accounts', sa.Column('hour_commitment',
        sa.Numeric(18, 2), nullable=True))
    op.add_column('cost_accounts', sa.Column('hour_open_commit',
        sa.Numeric(18, 2), nullable=True))
    op.add_column('cost_accounts', sa.Column('rate_type', sa.Text(), nullable=True))
    op.add_column('cost_accounts', sa.Column('notes',     sa.Text(), nullable=True))

    # FK constraints for the two new UUID columns
    op.create_foreign_key(
        'fk_cost_accounts_approved_curve', 'cost_accounts', 'curves',
        ['approved_curve_id'], ['id'])
    op.create_foreign_key(
        'fk_cost_accounts_vendor', 'cost_accounts', 'vendors',
        ['vendor_id'], ['id'])
    op.create_index('ix_cost_accounts_vendor', 'cost_accounts', ['vendor_id'])

    # ------------------------------------------------------------------
    # change_orders — segment, requester, dates, lock flag, comments
    # ------------------------------------------------------------------
    op.add_column('change_orders', sa.Column('segment',       sa.Text(), nullable=True))
    op.add_column('change_orders', sa.Column('reference_code', sa.Text(), nullable=True))
    op.add_column('change_orders', sa.Column('requester',     sa.Text(), nullable=True))
    op.add_column('change_orders', sa.Column('status_date',   sa.DateTime(), nullable=True))
    op.add_column('change_orders', sa.Column('is_final',
        sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('change_orders', sa.Column('comments',      sa.Text(), nullable=True))


def downgrade() -> None:
    # change_orders
    op.drop_column('change_orders', 'comments')
    op.drop_column('change_orders', 'is_final')
    op.drop_column('change_orders', 'status_date')
    op.drop_column('change_orders', 'requester')
    op.drop_column('change_orders', 'reference_code')
    op.drop_column('change_orders', 'segment')

    # cost_accounts
    op.drop_index('ix_cost_accounts_vendor', table_name='cost_accounts')
    op.drop_constraint('fk_cost_accounts_vendor', 'cost_accounts', type_='foreignkey')
    op.drop_constraint('fk_cost_accounts_approved_curve', 'cost_accounts', type_='foreignkey')
    op.drop_column('cost_accounts', 'notes')
    op.drop_column('cost_accounts', 'rate_type')
    op.drop_column('cost_accounts', 'hour_open_commit')
    op.drop_column('cost_accounts', 'hour_commitment')
    op.drop_column('cost_accounts', 'hour_incurred')
    op.drop_column('cost_accounts', 'cost_ac_variance')
    op.drop_column('cost_accounts', 'cost_eac_adjusted')
    op.drop_column('cost_accounts', 'cost_eac_proposed')
    op.drop_column('cost_accounts', 'pct_complete_adjusted')
    op.drop_column('cost_accounts', 'pct_complete_proposed')
    op.drop_column('cost_accounts', 'pct_complete_prev')
    op.drop_column('cost_accounts', 'approved_finish')
    op.drop_column('cost_accounts', 'approved_start')
    op.drop_column('cost_accounts', 'vendor_id')
    op.drop_column('cost_accounts', 'approved_curve_id')

    # projects
    op.drop_column('projects', 'budget_remain')
    op.drop_column('projects', 'cost_ac_variance')
    op.drop_column('projects', 'approved_finish')
    op.drop_column('projects', 'approved_start')
    op.drop_column('projects', 'notes')
    op.drop_column('projects', 'scope_of_work')
    op.drop_column('projects', 'controls_lead')
    op.drop_column('projects', 'pm_name')
    op.drop_column('projects', 'sponsor')
    op.drop_column('projects', 'asset')
    op.drop_column('projects', 'region')
    op.drop_column('projects', 'project_type')
    op.drop_column('projects', 'is_closed')
    op.drop_column('projects', 'project_status')

    op.execute(sa.text("DROP TYPE IF EXISTS project_type"))
    op.execute(sa.text("DROP TYPE IF EXISTS project_status"))
