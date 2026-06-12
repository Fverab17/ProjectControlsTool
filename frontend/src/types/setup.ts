export interface BreakdownNode {
  id: string
  code: string
  description: string
  level: number
  sort_order: number
  parent_code: string | null
  account_count: number
  cost_budget: number
}

export interface SetupPeriod {
  id: string
  code: string
  period_start: string
  period_end: string
  is_closed: boolean
  fiscal_year_end: boolean
}
