import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import PctMethod

if TYPE_CHECKING:
    from app.models.breakdown import CbsNode, Curve, Period, WbsNode
    from app.models.changes import ChangeLine, ChangeOrder
    from app.models.procurement import Commitment, InvoiceLine
    from app.models.users import Project


class CostAccount(Base):
    __tablename__ = "cost_accounts"
    __table_args__ = (UniqueConstraint("project_id", "account_code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    account_code: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    master_account_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("cost_accounts.id"), index=True)
    wbs_node_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("wbs_nodes.id"), index=True)
    cbs_node_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("cbs_nodes.id"), index=True)
    curve_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("curves.id"))
    discipline: Mapped[str | None] = mapped_column(Text)

    dim_1: Mapped[str | None] = mapped_column(Text)
    dim_2: Mapped[str | None] = mapped_column(Text)
    dim_3: Mapped[str | None] = mapped_column(Text)
    dim_4: Mapped[str | None] = mapped_column(Text)
    dim_5: Mapped[str | None] = mapped_column(Text)

    pct_complete: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))
    pct_complete_method: Mapped[PctMethod] = mapped_column(SAEnum(PctMethod, name="pct_method"), nullable=False, default=PctMethod.manual)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")

    baseline_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    baseline_finish: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    control_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    control_finish: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))

    # Denormalized cost aggregates — rolled up from cost_account_periods
    cost_budget: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_earned: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_actual: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_incurred: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_commitment: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_open_commit: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_etc: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_eac: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    hour_budget: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_earned: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_actual: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_etc: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_eac: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    # Parallel frozen BAC versions
    cost_bac_baseline: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_bac_approved: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_bac_control: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_bac_changes: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    cf_adv_pay_pct: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))
    cf_retention_pct: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))
    cash_flow_lag: Mapped[int | None] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="cost_accounts")
    wbs_node: Mapped["WbsNode | None"] = relationship(back_populates="cost_accounts")
    cbs_node: Mapped["CbsNode | None"] = relationship(back_populates="cost_accounts")
    curve: Mapped["Curve | None"] = relationship(back_populates="cost_accounts")
    master_account: Mapped["CostAccount | None"] = relationship("CostAccount", remote_side="CostAccount.id", foreign_keys=[master_account_id], back_populates="sub_accounts")
    sub_accounts: Mapped[list["CostAccount"]] = relationship("CostAccount", foreign_keys=[master_account_id], back_populates="master_account")

    periods: Mapped[list["CostAccountPeriod"]] = relationship(back_populates="cost_account", cascade="all, delete-orphan")
    budget_lines: Mapped[list["BudgetLine"]] = relationship(back_populates="cost_account", cascade="all, delete-orphan")
    change_lines: Mapped[list["ChangeLine"]] = relationship(back_populates="cost_account")
    commitments: Mapped[list["Commitment"]] = relationship(back_populates="cost_account")
    invoice_lines: Mapped[list["InvoiceLine"]] = relationship(back_populates="cost_account")


class CostAccountPeriod(Base):
    __tablename__ = "cost_account_periods"
    __table_args__ = (UniqueConstraint("cost_account_id", "period_id"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_account_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("cost_accounts.id", ondelete="CASCADE"), nullable=False)
    period_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("periods.id", ondelete="CASCADE"), nullable=False, index=True)

    budget_baseline: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    budget_approved: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    budget_control: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    earned: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    actual: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    commitment: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cash_flow: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    change_approved: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    hour_budget: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_earned: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_actual: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    cost_account: Mapped["CostAccount"] = relationship(back_populates="periods")
    period: Mapped["Period"] = relationship(back_populates="cost_account_periods")


class BudgetLine(Base):
    __tablename__ = "budget_lines"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_account_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("cost_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    change_order_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("change_orders.id"))
    description: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))
    quantity_unit: Mapped[str | None] = mapped_column(Text)
    hour_rate: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))
    hours: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    x_cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    is_final: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    imported: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cost_account: Mapped["CostAccount"] = relationship(back_populates="budget_lines")
    change_order: Mapped["ChangeOrder | None"] = relationship(back_populates="budget_lines")
