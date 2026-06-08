import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE } from '../lib/api'
import type { PeriodReport } from '../types/projects'

export function usePeriodReport(projectId: string | null, period: string) {
  const qc = useQueryClient()
  const key = ['period-report', projectId, period]

  const query = useQuery<PeriodReport>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/periods/${encodeURIComponent(period)}/report`
      )
      if (!res.ok) throw new Error('Failed to fetch period report')
      return res.json()
    },
    enabled: !!projectId && !!period,
  })

  const save = useMutation({
    mutationFn: async (data: Omit<PeriodReport, 'period_code'>) => {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/periods/${encodeURIComponent(period)}/report`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
      )
      if (!res.ok) throw new Error('Failed to save period report')
      return res.json() as Promise<PeriodReport>
    },
    onSuccess: (data) => qc.setQueryData(key, data),
  })

  return { ...query, save }
}
