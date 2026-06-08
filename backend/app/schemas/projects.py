from datetime import datetime
from uuid import uuid4
from uuid import UUID

from pydantic import BaseModel


class ProjectOut(BaseModel):
    id: UUID
    code: str
    title: str
    description: str | None
    scope_of_work: str | None
    base_currency_code: str
    multi_currency: bool
    baseline_start: datetime | None
    baseline_finish: datetime | None
    control_start: datetime | None
    control_finish: datetime | None
    cost_budget: float | None
    cost_actual: float | None
    cost_eac: float | None

    model_config = {"from_attributes": True}


class ProjectMemberOut(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str
    user_email: str
    project_role: str

    model_config = {"from_attributes": True}


class ProjectDetailOut(ProjectOut):
    members: list[ProjectMemberOut]
    period_count: int
    account_count: int
    wbs_node_count: int


class PeriodReportOut(BaseModel):
    period_code: str
    status_color: str
    status_narrative: str | None
    risks_narrative: str | None
    learnings_narrative: str | None

    model_config = {"from_attributes": True}


class PeriodReportUpsert(BaseModel):
    status_color: str = "green"
    status_narrative: str | None = None
    risks_narrative: str | None = None
    learnings_narrative: str | None = None
