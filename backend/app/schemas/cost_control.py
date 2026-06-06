from uuid import UUID

from pydantic import BaseModel


class WbsRowOut(BaseModel):
    wbs_node_id: UUID
    code: str
    description: str
    level: int
    sort_order: int
    is_rollup: bool
    parent_code: str | None

    # EVM columns — computed in the service, never stored
    cost_budget: float
    cost_earned: float
    cost_actual: float
    cost_open_commit: float
    cost_etc: float
    cost_eac: float
    pct_complete: float
    cpi: float               # always computed: EV / AC
    vac: float               # always computed: BAC - EAC

    account_count: int
    account_code: str | None = None        # set only on cost-account-level rows
    wbs_node_description: str | None = None  # WBS node description; set on CA rows (parent node's desc)
    has_account_children: bool = False     # True for leaf WBS nodes that have direct accounts


class CostControlOut(BaseModel):
    project_id: UUID
    project_code: str
    project_title: str
    rows: list[WbsRowOut]
