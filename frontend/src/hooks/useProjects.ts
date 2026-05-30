import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../lib/api'
import type { Project } from '../types/projects'

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects`)
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json()
    },
  })
}
