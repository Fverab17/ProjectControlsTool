export interface WbsRow {
  wbs_node_id: string
  code: string
  description: string
  level: number
  sort_order: number
  is_rollup: boolean
  parent_code: string | null
  cost_budget: number
  cost_earned: number
  cost_actual: number
  cost_open_commit: number
  cost_etc: number
  cost_eac: number
  pct_complete: number
  cpi: number
  vac: number
  account_count: number
  account_code: string | null
  wbs_node_description: string | null
  has_account_children: boolean
}

export interface CostControlData {
  project_id: string
  project_code: string
  project_title: string
  rows: WbsRow[]
}
