export interface Project {
  id: string
  code: string
  title: string
  description: string | null
  base_currency_code: string
  cost_budget: number | null
  cost_actual: number | null
  cost_eac: number | null
}
