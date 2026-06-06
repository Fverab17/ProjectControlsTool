import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { WbsRow } from '../../types/cost-control'

interface Props {
  visible: WbsRow[]
  selectedCode: string | null
  visibleIdx: number
  totalCount: number
  search: string
  setSearch: (s: string) => void
  expanded: Set<string>
  onSelect: (code: string) => void
  onToggle: (code: string) => void
  onNavigate: (delta: number) => void
}

interface ExtraColDef {
  id: string
  label: string
  defaultOn: boolean
  width: number
  align?: 'right'
  render: (row: WbsRow) => string
}

function fmtVal(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return `${v.toFixed(0)}`
}

const EXTRA_COLS: ExtraColDef[] = [
  { id: 'cost_budget',      label: 'Budget',      defaultOn: false, width: 72, align: 'right', render: r => fmtVal(r.cost_budget) },
  { id: 'cost_actual',      label: 'Actual',      defaultOn: false, width: 72, align: 'right', render: r => fmtVal(r.cost_actual) },
  { id: 'cost_eac',         label: 'EAC',         defaultOn: false, width: 72, align: 'right', render: r => fmtVal(r.cost_eac) },
  { id: 'cost_earned',      label: 'Earned',      defaultOn: false, width: 72, align: 'right', render: r => fmtVal(r.cost_earned) },
  { id: 'cost_etc',         label: 'ETC',         defaultOn: false, width: 65, align: 'right', render: r => fmtVal(r.cost_etc) },
  { id: 'cost_open_commit', label: 'Open Commit', defaultOn: false, width: 82, align: 'right', render: r => fmtVal(r.cost_open_commit) },
  { id: 'pct_complete',     label: '% Comp.',     defaultOn: false, width: 58, align: 'right', render: r => `${r.pct_complete.toFixed(0)}%` },
  { id: 'cpi',              label: 'CPI',         defaultOn: false, width: 50, align: 'right', render: r => r.cpi.toFixed(2) },
  { id: 'vac',              label: 'VAC',         defaultOn: false, width: 65, align: 'right', render: r => fmtVal(r.vac) },
]

const CODE_COL = '115px'

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

export function WbsNavPanel({
  visible, selectedCode, visibleIdx, totalCount,
  search, setSearch, expanded, onSelect, onToggle, onNavigate,
}: Props) {
  const [width, setWidth] = useState(420)
  const [visibleExtras, setVisibleExtras] = useState<Set<string>>(
    () => new Set(EXTRA_COLS.filter(c => c.defaultOn).map(c => c.id))
  )
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

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

  const toggleExtra = (id: string) => {
    setVisibleExtras(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const activeExtras = EXTRA_COLS.filter(c => visibleExtras.has(c.id))
  const gridTemplate = [CODE_COL, '1fr', ...activeExtras.map(c => `${c.width}px`)].join(' ')

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

      {/* Header */}
      <div
        className="px-3 py-1.5 text-[11px] font-semibold tracking-wide flex-shrink-0"
        style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}
      >
        Control Accounts — Navigation
      </div>

      {/* Nav controls */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}
      >
        <span className="num text-[10.5px] mr-1 flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
          {visibleIdx + 1} of {totalCount}
        </span>
        <NavBtn onClick={() => onNavigate(-visibleIdx)} disabled={visibleIdx <= 0}><ChevronsLeft size={11} /></NavBtn>
        <NavBtn onClick={() => onNavigate(-1)} disabled={visibleIdx <= 0}><ChevronLeft size={11} /></NavBtn>
        <NavBtn onClick={() => onNavigate(1)} disabled={visibleIdx >= visible.length - 1}><ChevronRight size={11} /></NavBtn>
        <NavBtn onClick={() => onNavigate(visible.length - 1 - visibleIdx)} disabled={visibleIdx >= visible.length - 1}><ChevronsRight size={11} /></NavBtn>
        <div className="flex-1" />
        <button style={btnBase}><Plus size={10} />Add</button>
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
              minWidth: 180, padding: '4px 0',
            }}>
              <div style={{
                padding: '3px 10px 6px', fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--ink-3)',
                borderBottom: '1px solid var(--border)',
              }}>
                Extra Columns
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', fontSize: 12, color: 'var(--ink-muted)', cursor: 'default', userSelect: 'none' }}>
                <input type="checkbox" checked disabled style={{ accentColor: 'var(--accent)' }} />
                Account ID
                <span style={{ fontSize: 9, color: 'var(--ink-muted)', marginLeft: 'auto', letterSpacing: '0.05em' }}>always</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', fontSize: 12, color: 'var(--ink-muted)', cursor: 'default', userSelect: 'none' }}>
                <input type="checkbox" checked disabled style={{ accentColor: 'var(--accent)' }} />
                Description
                <span style={{ fontSize: 9, color: 'var(--ink-muted)', marginLeft: 'auto', letterSpacing: '0.05em' }}>always</span>
              </label>
              <div style={{ borderTop: '1px solid var(--border)', margin: '3px 0' }} />
              {EXTRA_COLS.map(col => (
                <label
                  key={col.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 10px', fontSize: 12,
                    cursor: 'pointer', color: 'var(--ink-1)', userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleExtras.has(col.id)}
                    onChange={() => toggleExtra(col.id)}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-2 px-2 py-1"
          style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2 }}
        >
          <Search size={11} style={{ color: 'var(--ink-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accounts…"
            className="bg-transparent border-0 outline-none flex-1 text-[11px]"
            style={{ color: 'var(--ink-1)' }}
          />
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
        <div style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>Account ID</div>
        <div style={{ padding: '4px 8px' }}>Description</div>
        {activeExtras.map(col => (
          <div key={col.id} style={{ padding: '4px 8px', textAlign: col.align, borderLeft: '1px solid var(--border)' }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {visible.map(row => (
          <WbsNavRow
            key={row.code}
            row={row}
            isSelected={row.code === selectedCode}
            isExpanded={expanded.has(row.code)}
            onSelect={() => onSelect(row.code)}
            onToggle={() => onToggle(row.code)}
            activeExtras={activeExtras}
            gridTemplate={gridTemplate}
          />
        ))}
      </div>
    </div>
  )
}

interface RowProps {
  row: WbsRow
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggle: () => void
  activeExtras: ExtraColDef[]
  gridTemplate: string
}

function WbsNavRow({ row, isSelected, isExpanded, onSelect, onToggle, activeExtras, gridTemplate }: RowProps) {
  const isAccount = !!row.account_code
  const isExpandable = row.is_rollup || row.has_account_children

  const bg = isSelected
    ? 'var(--accent-soft)'
    : isAccount
      ? 'transparent'
      : row.level === 0 ? '#F0F0E8' : 'transparent'

  return (
    <div
      onClick={onSelect}
      className="grid items-center cursor-pointer"
      style={{
        gridTemplateColumns: gridTemplate,
        borderBottom: '1px solid var(--border)',
        background: bg,
        borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
        minHeight: 26,
      }}
    >
      {/* Code column */}
      <div
        className="num truncate"
        style={{
          padding: '3px 8px',
          fontSize: isAccount ? 10.5 : 11,
          color: isSelected ? 'var(--accent)' : 'var(--ink-2)',
          fontWeight: isAccount ? 500 : row.level === 0 ? 700 : 500,
          borderRight: '1px solid var(--border)',
          letterSpacing: isAccount ? '0.02em' : '0',
        }}
        title={isAccount ? row.account_code! : row.code}
      >
        {isAccount ? row.account_code : row.code}
      </div>

      {/* Description column */}
      <div
        className="flex items-center truncate"
        style={{ padding: '3px 6px 3px 0', paddingLeft: isAccount ? row.level * 10 + 4 : row.level * 12 + 4 }}
      >
        {isExpandable ? (
          <button
            onClick={e => { e.stopPropagation(); onToggle() }}
            style={{
              flexShrink: 0, marginRight: 3, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, color: 'var(--ink-3)',
              display: 'flex', alignItems: 'center',
            }}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : (
          <span style={{ flexShrink: 0, width: 14 }} />
        )}
        <span
          className="truncate"
          style={{
            fontSize: isAccount ? 10.5 : 11,
            color: isSelected ? 'var(--accent)' : 'var(--ink-1)',
            fontWeight: isAccount ? 400 : row.level === 0 ? 700 : row.is_rollup ? 600 : 500,
          }}
        >
          {row.description}
        </span>
      </div>

      {/* Extra columns */}
      {activeExtras.map(col => (
        <div
          key={col.id}
          className="num truncate"
          style={{
            padding: '3px 8px',
            fontSize: 10.5,
            textAlign: col.align,
            color: isSelected ? 'var(--accent)' : 'var(--ink-2)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          {col.render(row)}
        </div>
      ))}
    </div>
  )
}
