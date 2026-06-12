from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ChangeLineOut(BaseModel):
    id: UUID
    cost_account_id: UUID
    cost_account_code: str
    cost_account_description: str
    hour_impact: float
    cost_impact: float
    qty_element_id: UUID | None = None
    qty_element_code: str | None = None
    qty_element_unit: str | None = None
    qty_scope_impact: float | None = None


class ChangeOrderOut(BaseModel):
    id: UUID
    change_code: str
    description: str | None
    category: str | None
    status: str
    reason: str | None
    impact: str
    request_date: datetime | None
    issued_date: datetime | None
    approved_date: datetime | None
    scope_notes: str | None
    added_days: float | None
    pct_complete: float | None
    total_hour_impact: float
    total_cost_impact: float


class ChangeOrderDetailOut(ChangeOrderOut):
    lines: list[ChangeLineOut]


class ChangeOrderIn(BaseModel):
    change_code: str
    description: str | None = None
    category: str | None = None
    status: str = "pending"
    reason: str | None = None
    impact: str = "cost"
    request_date: datetime | None = None
    issued_date: datetime | None = None
    approved_date: datetime | None = None
    scope_notes: str | None = None
    added_days: float | None = None
    pct_complete: float | None = None


class WbsChangeItemOut(BaseModel):
    change_code: str
    description: str | None
    status: str
    total_cost_impact: float
    total_hour_impact: float
    request_date: datetime | None


class ChangeLineIn(BaseModel):
    account_code: str
    hour_impact: float = 0.0
    cost_impact: float = 0.0
    qty_element_code: str | None = None
    qty_scope_impact: float | None = None


class ChangeLineUpdate(BaseModel):
    hour_impact: float | None = None
    cost_impact: float | None = None
    qty_element_code: str | None = None
    qty_scope_impact: float | None = None


class ChangeOrderUpdate(BaseModel):
    description: str | None = None
    category: str | None = None
    status: str | None = None
    reason: str | None = None
    impact: str | None = None
    request_date: datetime | None = None
    issued_date: datetime | None = None
    approved_date: datetime | None = None
    scope_notes: str | None = None
    added_days: float | None = None
    pct_complete: float | None = None
