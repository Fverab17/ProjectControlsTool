export interface WbsRow {
  wbs_node_id: string
  code: string
  description: string
  level: number
  sort_order: number
  is_rollup: boolean
  parent_code: string | null
  cost_budget: number
  cost_bac_baseline: number
  cost_approved_changes: number
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
  etc_method: string | null             // set only on cost-account-level rows
  pct_complete_method: string | null    // set only on cost-account-level rows
  // Package assignment — populated once the packages API is wired up
  package_code: string | null
  package_description: string | null
}

export interface AccountQtyElement {
  id: string
  qty_element_id: string
  code: string
  description: string | null
  unit: string | null
  qty_scope: number
  qty_actual: number
  qty_eac: number
  qty_weight: number
  pct_complete: number
}

export type PctMethod =
  | 'manual' | 'weighted_steps' | 'rules_of_credit' | 'level_of_effort' | 'fifty_fifty'
  | 'qae' | 'prg' | 'hae' | 'cae'

export const PCT_METHOD_LABELS: Record<PctMethod, string> = {
  manual:           'Manual',
  weighted_steps:   'Weighted Steps',
  rules_of_credit:  'Rules of Credit',
  level_of_effort:  'Level of Effort',
  fifty_fifty:      '50/50',
  qae:              'QAE (Quantity)',
  prg:              'PRG (Milestones)',
  hae:              'HAE (Hours)',
  cae:              'CAE (Cost)',
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
