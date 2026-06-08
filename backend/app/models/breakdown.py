import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import CurveType

if TYPE_CHECKING:
    from app.models.cost import CostAccount, CostAccountPeriod
    from app.models.users import Project


class WbsNode(Base):
    __tablename__ = "wbs_nodes"
    __table_args__ = (UniqueConstraint("project_id", "code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    project: Mapped["Project"] = relationship(back_populates="wbs_nodes")
    cost_accounts: Mapped[list["CostAccount"]] = relationship(back_populates="wbs_node")


class CbsNode(Base):
    __tablename__ = "cbs_nodes"
    __table_args__ = (UniqueConstraint("project_id", "code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    project: Mapped["Project"] = relationship(back_populates="cbs_nodes")
    cost_accounts: Mapped[list["CostAccount"]] = relationship(back_populates="cbs_node")


class Period(Base):
    __tablename__ = "periods"
    __table_args__ = (UniqueConstraint("project_id", "code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    is_closed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fiscal_year_end: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    project: Mapped["Project"] = relationship(back_populates="periods")
    currency_rates: Mapped[list["CurrencyRate"]] = relationship(back_populates="period", cascade="all, delete-orphan")
    cost_account_periods: Mapped[list["CostAccountPeriod"]] = relationship(back_populates="period")


class CurrencyRate(Base):
    __tablename__ = "currency_rates"
    __table_args__ = (UniqueConstraint("period_id", "currency_code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    period_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("periods.id", ondelete="CASCADE"), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    rate_to_base: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)

    period: Mapped["Period"] = relationship(back_populates="currency_rates")


class PeriodReport(Base):
    __tablename__ = "period_reports"
    __table_args__ = (UniqueConstraint("project_id", "period_code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    period_code: Mapped[str] = mapped_column(Text, nullable=False)
    status_color: Mapped[str] = mapped_column(Text, nullable=False, default="green")
    status_narrative: Mapped[str | None] = mapped_column(Text)
    risks_narrative: Mapped[str | None] = mapped_column(Text)
    learnings_narrative: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="period_reports")


class Curve(Base):
    __tablename__ = "curves"
    __table_args__ = (UniqueConstraint("project_id", "code"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    curve_type: Mapped[CurveType] = mapped_column(SAEnum(CurveType, name="curve_type"), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="curves")
    # foreign_keys disambiguates from CostAccount.approved_curve_id which also points here
    cost_accounts: Mapped[list["CostAccount"]] = relationship(
        back_populates="curve",
        foreign_keys="[CostAccount.curve_id]",
    )


