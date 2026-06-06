from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ProjectOut(BaseModel):
    id: UUID
    code: str
    title: str
    description: str | None
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
