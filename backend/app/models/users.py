import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import ProjectRole, ProjectStatus, ProjectType, SystemRole

if TYPE_CHECKING:
    from app.models.breakdown import Curve, CbsNode, Period, PeriodReport, WbsNode
    from app.models.changes import ChangeOrder
    from app.models.cost import CostAccount, QtyElement
    from app.models.procurement import Contract


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    system_role: Mapped[SystemRole] = mapped_column(SAEnum(SystemRole, name="system_role"), nullable=False, default=SystemRole.student)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    memberships: Mapped[list["ProjectMember"]] = relationship(back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # Classification & ownership
    project_status: Mapped[ProjectStatus | None] = mapped_column(SAEnum(ProjectStatus, name="project_status"))
    is_closed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    project_type: Mapped[ProjectType | None] = mapped_column(SAEnum(ProjectType, name="project_type"))
    region: Mapped[str | None] = mapped_column(Text)
    asset: Mapped[str | None] = mapped_column(Text)
    sponsor: Mapped[str | None] = mapped_column(Text)
    pm_name: Mapped[str | None] = mapped_column(Text)
    controls_lead: Mapped[str | None] = mapped_column(Text)
    scope_of_work: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    # Three baseline date sets: original → approved → control (current)
    baseline_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    baseline_finish: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    approved_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    approved_finish: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    control_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    control_finish: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))

    base_currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    multi_currency: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Denormalized project rollup (refreshed when cost_accounts change)
    cost_budget: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_actual: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_eac: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    cost_ac_variance: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    budget_remain: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=Decimal("0"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    members: Mapped[list["ProjectMember"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    wbs_nodes: Mapped[list["WbsNode"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    cbs_nodes: Mapped[list["CbsNode"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    periods: Mapped[list["Period"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    curves: Mapped[list["Curve"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    cost_accounts: Mapped[list["CostAccount"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    contracts: Mapped[list["Contract"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    change_orders: Mapped[list["ChangeOrder"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    period_reports: Mapped[list["PeriodReport"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    qty_elements: Mapped[list["QtyElement"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("user_id", "project_id"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project_role: Mapped[ProjectRole] = mapped_column(SAEnum(ProjectRole, name="project_role"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="memberships")
    project: Mapped["Project"] = relationship(back_populates="members")
