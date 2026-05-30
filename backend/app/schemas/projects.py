from uuid import UUID

from pydantic import BaseModel


class ProjectOut(BaseModel):
    id: UUID
    code: str
    title: str
    description: str | None
    base_currency_code: str
    cost_budget: float | None
    cost_actual: float | None
    cost_eac: float | None

    model_config = {"from_attributes": True}
