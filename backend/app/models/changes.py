import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Numeric, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import ChangeCategory, ChangeImpact, ChangeReason, ChangeStatus

if TYPE_CHECKING:
    from app.models.cost import BudgetLine, CostAccount
    from app.models.breakdown import Period
    from app.models.users import Project


class ChangeOrder(Base):
    __tablename__ = "change_orders"
    __table_args__ = (UniqueConstraint("project_id", "change_code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    change_code: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ChangeStatus] = mapped_column(SAEnum(ChangeStatus, name="change_status"), nullable=False, default=ChangeStatus.trend)
    reason: Mapped[ChangeReason | None] = mapped_column(SAEnum(ChangeReason, name="change_reason"))
    impact: Mapped[ChangeImpact] = mapped_column(SAEnum(ChangeImpact, name="change_impact"), nullable=False, default=ChangeImpact.cost)
    category: Mapped[ChangeCategory | None] = mapped_column(SAEnum(ChangeCategory, name="change_category"), nullable=True)
    segment: Mapped[str | None] = mapped_column(Text)
    reference_code: Mapped[str | None] = mapped_column(Text)
    requester: Mapped[str | None] = mapped_column(Text)
    request_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    status_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    issued_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    approved_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    is_final: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    scope_notes: Mapped[str | None] = mapped_column(Text)
    comments: Mapped[str | None] = mapped_column(Text)
    period_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("periods.id"))
    added_days: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), default=Decimal("0"))
    pct_complete: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), default=Decimal("0"))

    project: Mapped["Project"] = relationship(back_populates="change_orders")
    period: Mapped["Period | None"] = relationship()
    change_lines: Mapped[list["ChangeLine"]] = relationship(back_populates="change_order", cascade="all, delete-orphan")
    budget_lines: Mapped[list["BudgetLine"]] = relationship(back_populates="change_order")


class ChangeLine(Base):
    __tablename__ = "change_lines"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    change_order_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("change_orders.id", ondelete="CASCADE"), nullable=False)
    cost_account_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("cost_accounts.id"), nullable=False, index=True)
    hour_impact: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_impact: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    change_order: Mapped["ChangeOrder"] = relationship(back_populates="change_lines")
    cost_account: Mapped["CostAccount"] = relationship(back_populates="change_lines")
