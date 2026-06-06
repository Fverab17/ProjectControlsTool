from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CostAccountOut(BaseModel):
    id: UUID
    account_code: str
    description: str
    discipline: str | None

    # Breakdown structure codes (joined)
    wbs_code: str | None
    wbs_description: str | None
    cbs_code: str | None
    cbs_description: str | None

    # Progress
    pct_complete: float
    pct_complete_method: str
    currency_code: str

    # Schedule dates
    baseline_start: datetime | None
    baseline_finish: datetime | None
    control_start: datetime | None
    control_finish: datetime | None

    # Cost aggregates
    cost_budget: float
    cost_earned: float
    cost_actual: float
    cost_incurred: float
    cost_commitment: float
    cost_open_commit: float
    cost_etc: float
    cost_eac: float

    # Hour aggregates
    hour_budget: float
    hour_earned: float
    hour_actual: float
    hour_etc: float
    hour_eac: float

    # Frozen BAC versions
    cost_bac_baseline: float
    cost_bac_approved: float
    cost_bac_control: float
    cost_bac_changes: float

    # Computed EVM — never stored, always derived
    cpi: float    # EV / AC
    spi: float    # EV / PV (earned / budget)
    vac: float    # BAC - EAC

    # Cash flow params
    cf_adv_pay_pct: float
    cf_retention_pct: float
    cash_flow_lag: int
