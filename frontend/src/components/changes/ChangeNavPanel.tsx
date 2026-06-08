import { useEffect, useRef, useState } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { ChangeOrder } from '../../types/changes'

interface Props {
  orders: ChangeOrder[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
}

const STATUS_COLOR: Record<string, string> = {
  pending:   '#6B7280',
  submitted: '#D97706',
  approved:  'var(--ink-positive)',
  cancelled: 'var(--ink-negative)',
  trend:     '#6B7280',
  rejected:  'var(--ink-negative)',
  withdrawn: '#6B7280',
}

interface ColDef {
  id: string
  label: string
  fixed: boolean
  defaultOn: boolean
  width: number
  align?: 'right'
  render: (o: ChangeOrder) => React.ReactNode
}

function fmtDate(s: string | null) { return s ? s.slice(0, 10) : '—' }
function fmtCost(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return `${v.toFixed(0)}`
}

const ALL_COLS: ColDef[] = [
  {
    id: 'change_code', label: 'Change ID', fixed: true, defaultOn: true, width: 90,
    render: o => o.change_code,
  },
  {
    id: 'description', label: 'Description', fixed: true, defaultOn: true, width: 200,
    render: o => o.description ?? '—',
  },
  {
    id: 'status', label: 'Status', fixed: false, defaultOn: true, width: 72, align: 'right',
    render: o => (
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
        color: STATUS_COLOR[o.status] ?? 'var(--ink-muted)',
      }}>
        {o.status}
      </span>
    ),
  },
  {
    id: 'category', label: 'Category', fixed: false, defaultOn: false, width: 90,
    render: o => o.category ? o.category.replace('_', ' ') : '—',
  },
  {
    id: 'impact', label: 'Impact', fixed: false, defaultOn: false, width: 65,
    render: o => o.impact,
  },
  {
    id: 'total_cost_impact', label: 'Cost Impact', fixed: false, defaultOn: false, width: 82, align: 'right',
    render: o => fmtCost(o.total_cost_impact),
  },
  {
    id: 'total_hour_impact', label: 'Hours', fixed: false, defaultOn: false, width: 60, align: 'right',
    render: o => o.total_hour_impact !== 0 ? `${o.total_hour_impact.toFixed(0)}h` : '—',
  },
  {
    id: 'added_days', label: 'Days', fixed: false, defaultOn: false, width: 52, align: 'right',
    render: o => o.added_days != null ? `${o.added_days}d` : '—',
  },
  {
    id: 'pct_complete', label: '% Comp.', fixed: false, defaultOn: false, width: 58, align: 'right',
    render: o => o.pct_complete != null ? `${o.pct_complete.toFixed(0)}%` : '—',
  },
  {
    id: 'request_date', label: 'Requested', fixed: false, defaultOn: false, width: 88,
    render: o => fmtDate(o.request_date),
  },
  {
    id: 'issued_date', label: 'Issued', fixed: false, defaultOn: false, width: 80,
    render: o => fmtDate(o.issued_date),
  },
  {
    id: 'approved_date', label: 'Approved', fixed: false, defaultOn: false, width: 88,
    render: o => fmtDate(o.approved_date),
  },
]

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 22, height: 22, flexShrink: 0,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2,
        color: disabled ? 'var(--ink-muted)' : 'var(--ink-2)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

const btnBase: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2,
  color: 'var(--ink-2)', fontSize: 11, padding: '2px 7px',
  display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
}

export function ChangeNavPanel({ orders, selectedId, onSelect, onAdd }: Props) {
  const [width, setWidth] = useLocalState<number>('nav_changes_width', 400)
  const [visibleColIds, setVisibleColIds] = useLocalState<string[]>(
    'nav_changes_cols',
    ALL_COLS.filter(c => c.defaultOn).map(c => c.id),
  )
  const visibleCols = new Set(visibleColIds)
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const selectedIdx = orders.findIndex(o => o.id === selectedId)

  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  const navigate = (delta: number) => {
    const next = orders[selectedIdx + delta]
    if (next) onSelect(next.id)
  }

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const onMove = (ev: MouseEvent) => setWidth(Math.max(200, Math.min(900, startW + ev.clientX - startX)))
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const toggleCol = (id: string) => {
    setVisibleColIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return Array.from(s)
    })
  }

  const activeCols = ALL_COLS.filter(c => visibleCols.has(c.id))
  const gridTemplate = activeCols.map(c => c.id === 'description' ? '1fr' : `${c.width}px`).join(' ')

  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{ width, position: 'relative', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={startResize}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 4,
          cursor: 'col-resize', zIndex: 10,
          background: 'transparent', transition: 'background 120ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      />

      {/* Panel header */}
      <div
        className="px-3 py-1.5 text-[11px] font-semibold tracking-wide flex-shrink-0"
        style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}
      >
        Change Orders — Navigation
      </div>

      {/* Nav controls */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}
      >
        <span className="num text-[10.5px] mr-1 flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
          {selectedIdx >= 0 ? selectedIdx + 1 : 0} of {orders.length}
        </span>
        <NavBtn onClick={() => navigate(-selectedIdx)} disabled={selectedIdx <= 0}><ChevronsLeft size={11} /></NavBtn>
        <NavBtn onClick={() => navigate(-1)} disabled={selectedIdx <= 0}><ChevronLeft size={11} /></NavBtn>
        <NavBtn onClick={() => navigate(1)} disabled={selectedIdx >= orders.length - 1}><ChevronRight size={11} /></NavBtn>
        <NavBtn onClick={() => navigate(orders.length - 1 - selectedIdx)} disabled={selectedIdx >= orders.length - 1}><ChevronsRight size={11} /></NavBtn>
        <div className="flex-1" />
        <button style={btnBase} onClick={onAdd}><Plus size={10} />Add</button>
        <button style={btnBase}><Trash2 size={10} />Delete</button>
        <button style={{ ...btnBase, padding: '2px 6px' }}><Filter size={10} /></button>

        {/* Column picker */}
        <div style={{ position: 'relative' }} ref={pickerRef}>
          <button
            style={{
              ...btnBase, padding: '2px 6px',
              background: showPicker ? 'var(--accent-soft)' : 'var(--surface)',
              borderColor: showPicker ? 'var(--accent)' : 'var(--border)',
            }}
            onClick={() => setShowPicker(v => !v)}
            title="Choose columns"
          >
            <SlidersHorizontal size={10} />
          </button>

          {showPicker && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 3px)', zIndex: 200,
              background: 'var(--surface)', border: '1px solid var(--border-strong)',
              borderRadius: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              minWidth: 190, padding: '4px 0',
            }}>
              <div style={{
                padding: '3px 10px 6px', fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--ink-3)',
                borderBottom: '1px solid var(--border)',
              }}>
                Visible Columns
              </div>
              {ALL_COLS.map(col => (
                <label
                  key={col.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 10px', fontSize: 12,
                    cursor: col.fixed ? 'default' : 'pointer',
                    color: col.fixed ? 'var(--ink-muted)' : 'var(--ink-1)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.id)}
                    disabled={col.fixed}
                    onChange={() => !col.fixed && toggleCol(col.id)}
                    style={{ accentColor: 'var(--accent)', cursor: col.fixed ? 'default' : 'pointer' }}
                  />
                  {col.label}
                  {col.fixed && (
                    <span style={{ fontSize: 9, color: 'var(--ink-muted)', marginLeft: 'auto', letterSpacing: '0.05em' }}>
                      always
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid flex-shrink-0"
        style={{
          gridTemplateColumns: gridTemplate,
          background: 'var(--surface-alt)',
          borderBottom: '1px solid var(--border-strong)',
          fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}
      >
        {activeCols.map(col => (
          <div key={col.id} style={{ padding: '4px 8px', textAlign: col.align }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {orders.map(order => {
          const isSelected = order.id === selectedId
          return (
            <div
              key={order.id}
              onClick={() => onSelect(order.id)}
              className="grid items-center cursor-pointer"
              style={{
                gridTemplateColumns: gridTemplate,
                borderBottom: '1px solid var(--border)',
                background: isSelected ? 'var(--accent-soft)' : 'transparent',
                borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {activeCols.map(col => (
                <div
                  key={col.id}
                  className={col.id === 'change_code' ? 'num' : ''}
                  style={{
                    padding: '5px 8px',
                    fontSize: 11,
                    fontWeight: col.id === 'change_code' ? 600 : 400,
                    color: isSelected && col.id !== 'status'
                      ? (col.id === 'change_code' ? 'var(--accent)' : 'var(--ink-1)')
                      : col.id === 'change_code' ? 'var(--ink-2)' : 'var(--ink-2)',
                    textAlign: col.align,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {col.render(order)}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
