import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import EtcMethod, PctMethod

if TYPE_CHECKING:
    from app.models.breakdown import CbsNode, Curve, Period, WbsNode
    from app.models.changes import ChangeLine, ChangeOrder
    from app.models.procurement import Commitment, InvoiceLine, Vendor
    from app.models.users import Project


class QtyElement(Base):
    """Project-level catalog of physical quantity element types (m³, t, m, ea, m², …).
    Analogous to PRISM's Control Element Definitions for type Q."""
    __tablename__ = "qty_elements"
    __table_args__ = (UniqueConstraint("project_id", "code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)         # e.g. 'QM3', 'QEA', 'QT'
    description: Mapped[str | None] = mapped_column(Text)           # e.g. 'Cubic Metres'
    unit: Mapped[str | None] = mapped_column(Text)                  # e.g. 'm³', 'ea', 't'
    sort_order: Mapped[int | None] = mapped_column(Integer, default=0)

    project: Mapped["Project"] = relationship(back_populates="qty_elements")
    account_qty_elements: Mapped[list["AccountQtyElement"]] = relationship(back_populates="qty_element", cascade="all, delete-orphan")
    budget_lines: Mapped[list["BudgetLine"]] = relationship(back_populates="qty_element")


class AccountQtyElement(Base):
    """Quantity subpane: one row per (cost account × quantity element).
    Stores the scope, installed-to-date, and EAC quantities plus the weight
    used in the QAE weighted-average progress calculation."""
    __tablename__ = "account_qty_elements"
    __table_args__ = (UniqueConstraint("cost_account_id", "qty_element_id"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_account_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("cost_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    qty_element_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("qty_elements.id"), nullable=False, index=True)

    qty_scope: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))   # BAC-equivalent total scope
    qty_actual: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))  # installed / completed to date
    qty_eac: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))     # forecast at completion
    qty_weight: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("1"))   # weight in QAE weighted average

    cost_account: Mapped["CostAccount"] = relationship(back_populates="qty_elements")
    qty_element: Mapped["QtyElement"] = relationship(back_populates="account_qty_elements")


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
    approved_curve_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("curves.id"))
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("vendors.id"), index=True)
    discipline: Mapped[str | None] = mapped_column(Text)

    dim_1: Mapped[str | None] = mapped_column(Text)
    dim_2: Mapped[str | None] = mapped_column(Text)
    dim_3: Mapped[str | None] = mapped_column(Text)
    dim_4: Mapped[str | None] = mapped_column(Text)
    dim_5: Mapped[str | None] = mapped_column(Text)

    pct_complete: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))
    pct_complete_prev: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))
    pct_complete_proposed: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))
    pct_complete_adjusted: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))
    pct_complete_method: Mapped[PctMethod] = mapped_column(SAEnum(PctMethod, name="pct_method"), nullable=False, default=PctMethod.manual)
    etc_method: Mapped[EtcMethod] = mapped_column(SAEnum(EtcMethod, name="etc_method"), nullable=False, default=EtcMethod.manual)

    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    rate_type: Mapped[str | None] = mapped_column(Text)

    # Three baseline date sets: original → approved → control (current)
    baseline_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    baseline_finish: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    approved_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    approved_finish: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
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
    cost_eac_proposed: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_eac_adjusted: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_ac_variance: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    # Hour aggregates — parallel set to cost aggregates
    hour_budget: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_earned: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_actual: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_incurred: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_commitment: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hour_open_commit: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
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

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="cost_accounts")
    wbs_node: Mapped["WbsNode | None"] = relationship(back_populates="cost_accounts")
    cbs_node: Mapped["CbsNode | None"] = relationship(back_populates="cost_accounts")
    curve: Mapped["Curve | None"] = relationship(back_populates="cost_accounts", foreign_keys=[curve_id])
    approved_curve: Mapped["Curve | None"] = relationship("Curve", foreign_keys=[approved_curve_id])
    vendor: Mapped["Vendor | None"] = relationship("Vendor", foreign_keys=[vendor_id])
    master_account: Mapped["CostAccount | None"] = relationship("CostAccount", remote_side="CostAccount.id", foreign_keys=[master_account_id], back_populates="sub_accounts")
    sub_accounts: Mapped[list["CostAccount"]] = relationship("CostAccount", foreign_keys=[master_account_id], back_populates="master_account")

    periods: Mapped[list["CostAccountPeriod"]] = relationship(back_populates="cost_account", cascade="all, delete-orphan")
    budget_lines: Mapped[list["BudgetLine"]] = relationship(back_populates="cost_account", cascade="all, delete-orphan")
    qty_elements: Mapped[list["AccountQtyElement"]] = relationship(back_populates="cost_account", cascade="all, delete-orphan")
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

    # Physical quantity columns — for the account's primary quantity element.
    # Drives QEB/QCB budget-to-date progress methods and quantity S-curves.
    qty_budget: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))
    qty_actual: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))
    qty_earned: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))

    # Snapshot fields — populated when the period is closed via close_period().
    snap_pct_complete:        Mapped[Decimal | None] = mapped_column(Numeric(6,  4))
    snap_cost_earned:         Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    snap_cost_actual_to_date: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    snap_cost_etc:            Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    snap_cost_eac:            Mapped[Decimal | None] = mapped_column(Numeric(18, 2))

    cost_account: Mapped["CostAccount"] = relationship(back_populates="periods")
    period: Mapped["Period"] = relationship(back_populates="cost_account_periods")


class BudgetLine(Base):
    __tablename__ = "budget_lines"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_account_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("cost_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    change_order_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("change_orders.id"))
    qty_element_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("qty_elements.id"), index=True)

    description: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))
    quantity_unit: Mapped[str | None] = mapped_column(Text)
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))   # cost per qty unit
    hour_rate: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))   # hours per qty unit
    hours: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    x_cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    is_final: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    imported: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cost_account: Mapped["CostAccount"] = relationship(back_populates="budget_lines")
    change_order: Mapped["ChangeOrder | None"] = relationship(back_populates="budget_lines")
    qty_element: Mapped["QtyElement | None"] = relationship(back_populates="budget_lines")
