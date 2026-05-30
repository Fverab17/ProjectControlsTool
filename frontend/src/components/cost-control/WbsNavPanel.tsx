import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Plus, Search, Trash2 } from 'lucide-react'
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

export function WbsNavPanel({ visible, selectedCode, visibleIdx, totalCount, search, setSearch, expanded, onSelect, onToggle, onNavigate }: Props) {
  return (
    <div
      className="flex-shrink-0 flex flex-col border-r overflow-hidden"
      style={{ width: 310, background: 'var(--surface)' }}
    >
      {/* Panel header */}
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
        className="grid px-2 py-1 flex-shrink-0"
        style={{
          gridTemplateColumns: '90px 1fr',
          background: 'var(--surface-alt)',
          borderBottom: '1px solid var(--border-strong)',
          fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}
      >
        <div>Account ID</div>
        <div>Description</div>
      </div>

      {/* Tree rows */}
      <div className="flex-1 overflow-y-auto">
        {visible.map(row => (
          <WbsNavRow
            key={row.code}
            row={row}
            isSelected={row.code === selectedCode}
            isExpanded={expanded.has(row.code)}
            onSelect={() => onSelect(row.code)}
            onToggle={() => onToggle(row.code)}
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
}

function WbsNavRow({ row, isSelected, isExpanded, onSelect, onToggle }: RowProps) {
  return (
    <div
      onClick={onSelect}
      className="grid items-center cursor-pointer"
      style={{
        gridTemplateColumns: '90px 1fr',
        borderBottom: '1px solid var(--border)',
        background: isSelected ? 'var(--accent-soft)' : row.level === 0 ? '#F0F0E8' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      <div
        className="px-2 py-1.5 num"
        style={{ fontSize: 11, color: isSelected ? 'var(--accent)' : 'var(--ink-2)', fontWeight: row.level === 0 ? 600 : 400 }}
      >
        {row.code}
      </div>
      <div className="py-1.5 pr-2 flex items-center" style={{ paddingLeft: row.level * 10 + 4 }}>
        {row.is_rollup ? (
          <button
            onClick={e => { e.stopPropagation(); onToggle() }}
            className="mr-1 flex-shrink-0"
            style={{ color: 'var(--ink-3)' }}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : (
          <span className="mr-1 flex-shrink-0" style={{ width: 14 }} />
        )}
        <span style={{ fontSize: 11, color: isSelected ? 'var(--accent)' : 'var(--ink-1)', fontWeight: row.level === 0 ? 600 : row.is_rollup ? 500 : 400 }}>
          {row.description}
        </span>
      </div>
    </div>
  )
}
