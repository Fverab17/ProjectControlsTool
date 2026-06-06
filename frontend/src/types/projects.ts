export interface Project {
  id: string
  code: string
  title: string
  description: string | null
  base_currency_code: string
  multi_currency: boolean
  baseline_start: string | null
  baseline_finish: string | null
  control_start: string | null
  control_finish: string | null
  cost_budget: number | null
  cost_actual: number | null
  cost_eac: number | null
}

export interface ProjectMember {
  id: string
  user_id: string
  user_name: string
  user_email: string
  project_role: string
}

export interface ProjectDetail extends Project {
  members: ProjectMember[]
  period_count: number
  account_count: number
  wbs_node_count: number
}
