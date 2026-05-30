import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../lib/api'
import type { CostControlData } from '../types/cost-control'

export function useCostControl(projectId: string | null) {
  return useQuery<CostControlData>({
    queryKey: ['cost-control', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects/${projectId}/cost-control`)
      if (!res.ok) throw new Error('Failed to fetch cost control data')
      return res.json()
    },
    enabled: !!projectId,
  })
}
