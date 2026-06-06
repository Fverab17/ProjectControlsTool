export interface ChangeLine {
  id: string
  cost_account_id: string
  cost_account_code: string
  cost_account_description: string
  hour_impact: number
  cost_impact: number
}

export interface ChangeOrder {
  id: string
  change_code: string
  description: string | null
  category: 'budget_transfer' | 'scope' | 'growth' | 'trend' | null
  status: 'pending' | 'submitted' | 'approved' | 'cancelled' | string
  reason: string | null
  impact: 'cost' | 'schedule' | 'both' | 'none'
  request_date: string | null
  issued_date: string | null
  approved_date: string | null
  scope_notes: string | null
  added_days: number | null
  pct_complete: number | null
  total_hour_impact: number
  total_cost_impact: number
}

export interface ChangeOrderDetail extends ChangeOrder {
  lines: ChangeLine[]
}

export interface ChangeOrderIn {
  change_code: string
  description?: string
  category?: string
  status?: string
  reason?: string
  impact?: string
  request_date?: string | null
  issued_date?: string | null
  approved_date?: string | null
  scope_notes?: string
  added_days?: number | null
  pct_complete?: number | null
}

export interface WbsChangeItem {
  change_code: string
  description: string | null
  status: string
  total_cost_impact: number
  total_hour_impact: number
  request_date: string | null
}

export interface ChangeOrderUpdate {
  description?: string
  category?: string | null
  status?: string
  reason?: string | null
  impact?: string
  request_date?: string | null
  issued_date?: string | null
  approved_date?: string | null
  scope_notes?: string | null
  added_days?: number | null
  pct_complete?: number | null
}
