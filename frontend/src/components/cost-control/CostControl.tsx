import { useState, useMemo } from 'react'
import { useCostControl } from '../../hooks/useCostControl'
import type { WbsRow } from '../../types/cost-control'
import { CostControlRibbon } from './CostControlRibbon'
import { CostControlTabBar } from './CostControlTabBar'
import { WbsNavPanel } from './WbsNavPanel'
import { AccountDataPanel } from './AccountDataPanel'
import { AccountDetailTabs } from './AccountDetailTabs'

interface Props { projectId: string; period: string }

export function CostControl({ projectId, period }: Props) {
  const { data, isLoading, error } = useCostControl(projectId)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['1', '2', '2.1', '2.2', '3'])
  )
  const [bottomTab, setBottomTab] = useState('groups')
  const [search, setSearch] = useState('')

  const rows: WbsRow[] = data?.rows ?? []
  const effectiveCode = selectedCode ?? (rows[0]?.code ?? null)

  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(row => {
      // While searching: bypass expand/collapse and match code or description
      if (q) {
        return row.code.toLowerCase().includes(q) || row.description.toLowerCase().includes(q)
      }
      // Normal mode: respect expand/collapse hierarchy
      if (row.parent_code) {
        let p: string | null = row.parent_code
        while (p) {
          if (!expanded.has(p)) return false
          p = rows.find(r => r.code === p)?.parent_code ?? null
        }
      }
      return true
    })
  }, [rows, expanded, search])

  const visibleIdx = visible.findIndex(r => r.code === effectiveCode)
  const selectedRow = rows.find(r => r.code === effectiveCode) ?? null

  const toggle = (code: string) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(code) ? next.delete(code) : next.add(code)
    return next
  })

  const navigate = (delta: number) => {
    const next = visible[visibleIdx + delta]
    if (next) setSelectedCode(next.code)
  }

  if (isLoading) return (
    <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
      Loading…
    </div>
  )

  if (error) return (
    <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-negative)', fontSize: 13 }}>
      Failed to load data. Is the backend running?
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      <CostControlRibbon />
      <CostControlTabBar />
      <div className="flex-1 flex min-h-0">
        <WbsNavPanel
          visible={visible}
          selectedCode={effectiveCode}
          visibleIdx={visibleIdx}
          totalCount={rows.length}
          search={search}
          setSearch={setSearch}
          expanded={expanded}
          onSelect={setSelectedCode}
          onToggle={toggle}
          onNavigate={navigate}
        />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <AccountDataPanel row={selectedRow} period={period} />
          <AccountDetailTabs projectId={projectId} row={selectedRow} tab={bottomTab} setTab={setBottomTab} />
        </div>
      </div>
    </div>
  )
}
