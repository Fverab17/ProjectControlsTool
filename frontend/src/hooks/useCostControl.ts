import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../lib/api'
import type { CostControlData } from '../types/cost-control'

export function useCostControl(projectId: string | null, period: string) {
  return useQuery<CostControlData>({
    queryKey: ['cost-control', projectId, period],
    queryFn: async () => {
      const url = `${API_BASE}/projects/${projectId}/cost-control?period=${encodeURIComponent(period)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch cost control data')
      return res.json()
    },
    enabled: !!projectId,
  })
}
