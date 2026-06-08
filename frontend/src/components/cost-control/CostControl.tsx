import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCostControl } from '../../hooks/useCostControl'
import type { WbsRow } from '../../types/cost-control'
import { CostControlRibbon } from './CostControlRibbon'
import { CostControlTabBar } from './CostControlTabBar'
import { WbsNavPanel } from './WbsNavPanel'
import { AccountDataPanel } from './AccountDataPanel'
import { AccountDetailTabs } from './AccountDetailTabs'
import { ImportModal } from './ImportModal'
import { useLocalState } from '../../hooks/useLocalState'

interface Props { projectId: string; period: string }

export function CostControl({ projectId, period }: Props) {
  const { data, isLoading, error } = useCostControl(projectId, period)
  const queryClient = useQueryClient()
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['1', '2', '2.1', '2.2', '3'])
  )
  const [bottomTab, setBottomTab] = useState('groups')
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [dataPanelHeight, setDataPanelHeight] = useLocalState('cpm:cost-control:data-panel-height', 300)

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = dataPanelHeight
    const onMove = (ev: MouseEvent) => {
      setDataPanelHeight(Math.max(150, Math.min(600, startHeight + ev.clientY - startY)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

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
      <CostControlRibbon
        period={period}
        projectId={projectId}
        periodIsClosed={data?.period_is_closed ?? false}
        onPeriodClosed={() => queryClient.invalidateQueries({ queryKey: ['cost-control', projectId, period] })}
        onImport={() => setShowImport(true)}
      />
      {showImport && (
        <ImportModal
          period={period}
          projectId={projectId}
          onClose={() => setShowImport(false)}
          onImported={() => queryClient.invalidateQueries({ queryKey: ['cost-control', projectId, period] })}
        />
      )}
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
          <AccountDataPanel
            row={selectedRow}
            period={period}
            projectId={projectId}
            height={dataPanelHeight}
            onAccountUpdated={() => queryClient.invalidateQueries({ queryKey: ['cost-control', projectId] })}
          />
          <div
            onMouseDown={handleDragStart}
            style={{
              height: 4, flexShrink: 0, cursor: 'row-resize',
              background: 'var(--border-strong)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}
          />
          <AccountDetailTabs projectId={projectId} row={selectedRow} tab={bottomTab} setTab={setBottomTab} />
        </div>
      </div>
    </div>
  )
}
