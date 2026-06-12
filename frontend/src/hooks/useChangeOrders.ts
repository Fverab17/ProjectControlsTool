import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE } from '../lib/api'
import type { ChangeLine, ChangeOrder, ChangeOrderDetail, ChangeOrderIn, ChangeOrderUpdate, WbsChangeItem } from '../types/changes'

export function useChangeOrders(projectId: string) {
  return useQuery<ChangeOrder[]>({
    queryKey: ['change-orders', projectId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/projects/${projectId}/change-orders`)
      if (!r.ok) throw new Error('Failed to load change orders')
      return r.json()
    },
    enabled: !!projectId,
  })
}

export function useChangeOrder(projectId: string, coId: string | null) {
  return useQuery<ChangeOrderDetail>({
    queryKey: ['change-order', projectId, coId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/projects/${projectId}/change-orders/${coId}`)
      if (!r.ok) throw new Error('Failed to load change order')
      return r.json()
    },
    enabled: !!projectId && !!coId,
  })
}

export function useAccountChanges(projectId: string, accountCode: string | null) {
  return useQuery<WbsChangeItem[]>({
    queryKey: ['account-changes', projectId, accountCode],
    queryFn: async () => {
      const r = await fetch(
        `${API_BASE}/projects/${projectId}/account-changes?account_code=${encodeURIComponent(accountCode!)}`
      )
      if (!r.ok) throw new Error('Failed to load changes')
      return r.json()
    },
    enabled: !!projectId && !!accountCode,
  })
}

export function useWbsChanges(projectId: string, wbsCode: string | null) {
  return useQuery<WbsChangeItem[]>({
    queryKey: ['wbs-changes', projectId, wbsCode],
    queryFn: async () => {
      const r = await fetch(
        `${API_BASE}/projects/${projectId}/wbs-changes?wbs_code=${encodeURIComponent(wbsCode!)}`
      )
      if (!r.ok) throw new Error('Failed to load changes')
      return r.json()
    },
    enabled: !!projectId && !!wbsCode,
  })
}

export function useCreateChangeOrder(projectId: string) {
  const qc = useQueryClient()
  return useMutation<ChangeOrder, Error, ChangeOrderIn>({
    mutationFn: async (body) => {
      const r = await fetch(`${API_BASE}/projects/${projectId}/change-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Failed to create change order')
      }
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-orders', projectId] })
    },
  })
}

export function useUpdateChangeOrder(projectId: string, coId: string) {
  const qc = useQueryClient()
  return useMutation<ChangeOrder, Error, ChangeOrderUpdate>({
    mutationFn: async (body) => {
      const r = await fetch(`${API_BASE}/projects/${projectId}/change-orders/${coId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Failed to update change order')
      }
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-orders', projectId] })
      qc.invalidateQueries({ queryKey: ['change-order', projectId, coId] })
    },
  })
}

export interface AddChangeLineArgs {
  account_code: string
  hour_impact: number
  cost_impact: number
  qty_element_code?: string | null
  qty_scope_impact?: number | null
}

export interface UpdateChangeLineArgs {
  lineId: string
  hour_impact: number
  cost_impact: number
  qty_element_code?: string | null
  qty_scope_impact?: number | null
}

export function useAddChangeLine(projectId: string, coId: string) {
  const qc = useQueryClient()
  return useMutation<ChangeLine, Error, AddChangeLineArgs>({
    mutationFn: async (body) => {
      const r = await fetch(`${API_BASE}/projects/${projectId}/change-orders/${coId}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Failed to add line')
      }
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-order', projectId, coId] })
      qc.invalidateQueries({ queryKey: ['change-orders', projectId] })
    },
  })
}

export function useUpdateChangeLine(projectId: string, coId: string) {
  const qc = useQueryClient()
  return useMutation<ChangeLine, Error, UpdateChangeLineArgs>({
    mutationFn: async ({ lineId, hour_impact, cost_impact, qty_element_code, qty_scope_impact }) => {
      const r = await fetch(`${API_BASE}/projects/${projectId}/change-orders/${coId}/lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hour_impact, cost_impact, qty_element_code, qty_scope_impact }),
      })
      if (!r.ok) throw new Error('Failed to update line')
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-order', projectId, coId] })
      qc.invalidateQueries({ queryKey: ['change-orders', projectId] })
    },
  })
}

export function useDeleteChangeLine(projectId: string, coId: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (lineId) => {
      const r = await fetch(`${API_BASE}/projects/${projectId}/change-orders/${coId}/lines/${lineId}`, {
        method: 'DELETE',
      })
      if (!r.ok) throw new Error('Failed to delete line')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-order', projectId, coId] })
      qc.invalidateQueries({ queryKey: ['change-orders', projectId] })
    },
  })
}
