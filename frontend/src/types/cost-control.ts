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
  cost_period_incurred: number
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
  etc_method: string | null   // set only on cost-account-level rows
}

export type EtcMethod = 'manual' | 'budget_remaining' | 'performance_factor' | 'commitments' | 'closed'

export const ETC_METHOD_LABELS: Record<EtcMethod, string> = {
  manual:             'Manual ETC',
  budget_remaining:   'Budget Remaining',
  performance_factor: 'Performance Factor',
  commitments:        'Commitments',
  closed:             'Closed',
}

export const ETC_METHOD_FORMULA: Record<EtcMethod, string> = {
  manual:             'EAC = AC + ETC (entered)',
  budget_remaining:   'ETC = BAC − EV;  EAC = AC + ETC',
  performance_factor: 'EAC = BAC ÷ CPI',
  commitments:        'EAC = AC + Open Commits',
  closed:             'ETC = 0;  EAC = AC',
}

export interface CostControlData {
  project_id: string
  project_code: string
  project_title: string
  period_is_closed: boolean
  rows: WbsRow[]
}
