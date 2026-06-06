import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../lib/api'
import type { ProjectDetail } from '../types/projects'

export function useProject(projectId: string | null) {
  return useQuery<ProjectDetail>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects/${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      return res.json()
    },
    enabled: !!projectId,
  })
}
