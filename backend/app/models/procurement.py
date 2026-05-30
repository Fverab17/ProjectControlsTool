import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import ContractStatus, InvoiceStatus, PriceType

if TYPE_CHECKING:
    from app.models.cost import CostAccount
    from app.models.breakdown import Period
    from app.models.users import Project


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    contact: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    class_code: Mapped[str | None] = mapped_column(Text)

    contracts: Mapped[list["Contract"]] = relationship(back_populates="vendor")


class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = (UniqueConstraint("project_id", "contract_code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    contract_code: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("vendors.id"), index=True)
    status: Mapped[ContractStatus] = mapped_column(SAEnum(ContractStatus, name="contract_status"), nullable=False, default=ContractStatus.draft)
    price_type: Mapped[PriceType] = mapped_column(SAEnum(PriceType, name="price_type"), nullable=False, default=PriceType.lump_sum)
    award_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    mobilize_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    hours: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    ceiling: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    retention_pct: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))
    adv_payment_pct: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="contracts")
    vendor: Mapped["Vendor | None"] = relationship(back_populates="contracts")
    contract_lines: Mapped[list["ContractLine"]] = relationship(back_populates="contract", cascade="all, delete-orphan")
    commitments: Mapped[list["Commitment"]] = relationship(back_populates="contract", cascade="all, delete-orphan")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="contract", cascade="all, delete-orphan")


class ContractLine(Base):
    __tablename__ = "contract_lines"
    __table_args__ = (UniqueConstraint("contract_id", "item_no"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    item_no: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), default=Decimal("0"))
    hours: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    contract: Mapped["Contract"] = relationship(back_populates="contract_lines")


class Commitment(Base):
    __tablename__ = "commitments"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    cost_account_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("cost_accounts.id"), nullable=False, index=True)
    period_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("periods.id"), nullable=False, index=True)
    item: Mapped[int | None] = mapped_column(Integer)
    revision: Mapped[int | None] = mapped_column(Integer, default=0)
    hours: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    x_cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    post_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    pending: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    contract: Mapped["Contract"] = relationship(back_populates="commitments")
    cost_account: Mapped["CostAccount"] = relationship(back_populates="commitments")
    period: Mapped["Period"] = relationship()


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    invoice_no: Mapped[str] = mapped_column(Text, nullable=False)
    invoice_date: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(SAEnum(InvoiceStatus, name="invoice_status"), nullable=False, default=InvoiceStatus.pending)
    total_cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")

    contract: Mapped["Contract"] = relationship(back_populates="invoices")
    invoice_lines: Mapped[list["InvoiceLine"]] = relationship(back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    cost_account_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("cost_accounts.id"), nullable=False, index=True)
    period_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("periods.id"), nullable=False, index=True)
    hours: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    x_cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    invoice: Mapped["Invoice"] = relationship(back_populates="invoice_lines")
    cost_account: Mapped["CostAccount"] = relationship(back_populates="invoice_lines")
    period: Mapped["Period"] = relationship()
