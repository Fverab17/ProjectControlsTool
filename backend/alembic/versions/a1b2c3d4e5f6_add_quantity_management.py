"""add quantity management

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-06-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "a1b2c3d4e5f6"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- extend pct_method enum ---
    for val in ("qae", "prg", "hae", "cae"):
        op.execute(f"ALTER TYPE pct_method ADD VALUE IF NOT EXISTS '{val}'")

    # --- qty_elements (project-level element catalogue) ---
    op.create_table(
        "qty_elements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("unit", sa.Text),
        sa.Column("sort_order", sa.Integer, default=0),
        sa.UniqueConstraint("project_id", "code", name="uq_qty_elements_project_code"),
    )
    op.create_index("ix_qty_elements_project_id", "qty_elements", ["project_id"])

    # --- account_qty_elements (quantity subpane: N rows per account) ---
    op.create_table(
        "account_qty_elements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("cost_account_id", UUID(as_uuid=True), sa.ForeignKey("cost_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("qty_element_id", UUID(as_uuid=True), sa.ForeignKey("qty_elements.id"), nullable=False),
        sa.Column("qty_scope", sa.Numeric(18, 4), default=0),
        sa.Column("qty_actual", sa.Numeric(18, 4), default=0),
        sa.Column("qty_eac", sa.Numeric(18, 4), default=0),
        sa.Column("qty_weight", sa.Numeric(6, 4), default=1),
        sa.UniqueConstraint("cost_account_id", "qty_element_id", name="uq_account_qty_element"),
    )
    op.create_index("ix_account_qty_elements_account", "account_qty_elements", ["cost_account_id"])
    op.create_index("ix_account_qty_elements_element", "account_qty_elements", ["qty_element_id"])

    # --- budget_lines: qty FK + unit cost ---
    op.add_column("budget_lines", sa.Column("qty_element_id", UUID(as_uuid=True), sa.ForeignKey("qty_elements.id"), nullable=True))
    op.add_column("budget_lines", sa.Column("unit_cost", sa.Numeric(18, 4), nullable=True))
    op.create_index("ix_budget_lines_qty_element_id", "budget_lines", ["qty_element_id"])

    # --- cost_account_periods: qty columns ---
    op.add_column("cost_account_periods", sa.Column("qty_budget", sa.Numeric(18, 4), nullable=True))
    op.add_column("cost_account_periods", sa.Column("qty_actual", sa.Numeric(18, 4), nullable=True))
    op.add_column("cost_account_periods", sa.Column("qty_earned", sa.Numeric(18, 4), nullable=True))

    # --- contract_lines: qty columns ---
    op.add_column("contract_lines", sa.Column("qty_element_id", UUID(as_uuid=True), sa.ForeignKey("qty_elements.id"), nullable=True))
    op.add_column("contract_lines", sa.Column("quantity_unit", sa.Text, nullable=True))
    op.add_column("contract_lines", sa.Column("qty_committed", sa.Numeric(18, 4), nullable=True))
    op.add_column("contract_lines", sa.Column("qty_installed", sa.Numeric(18, 4), nullable=True))
    op.add_column("contract_lines", sa.Column("price_per_unit", sa.Numeric(18, 4), nullable=True))

    # --- invoice_lines: qty columns ---
    op.add_column("invoice_lines", sa.Column("qty_element_id", UUID(as_uuid=True), sa.ForeignKey("qty_elements.id"), nullable=True))
    op.add_column("invoice_lines", sa.Column("quantity", sa.Numeric(18, 4), nullable=True))


def downgrade() -> None:
    op.drop_column("invoice_lines", "quantity")
    op.drop_column("invoice_lines", "qty_element_id")

    op.drop_column("contract_lines", "price_per_unit")
    op.drop_column("contract_lines", "qty_installed")
    op.drop_column("contract_lines", "qty_committed")
    op.drop_column("contract_lines", "quantity_unit")
    op.drop_column("contract_lines", "qty_element_id")

    op.drop_column("cost_account_periods", "qty_earned")
    op.drop_column("cost_account_periods", "qty_actual")
    op.drop_column("cost_account_periods", "qty_budget")

    op.drop_index("ix_budget_lines_qty_element_id", "budget_lines")
    op.drop_column("budget_lines", "unit_cost")
    op.drop_column("budget_lines", "qty_element_id")

    op.drop_index("ix_account_qty_elements_element", "account_qty_elements")
    op.drop_index("ix_account_qty_elements_account", "account_qty_elements")
    op.drop_table("account_qty_elements")

    op.drop_index("ix_qty_elements_project_id", "qty_elements")
    op.drop_table("qty_elements")

    # Note: PostgreSQL does not support removing enum values; downgrade leaves qae/prg/hae/cae in place
