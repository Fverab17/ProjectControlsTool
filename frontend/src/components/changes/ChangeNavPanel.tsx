import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Plus, Trash2 } from 'lucide-react'
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
  const selectedIdx = orders.findIndex(o => o.id === selectedId)

  const navigate = (delta: number) => {
    const next = orders[selectedIdx + delta]
    if (next) onSelect(next.id)
  }

  return (
    <div
      className="flex-shrink-0 flex flex-col border-r overflow-hidden"
      style={{ width: 400, background: 'var(--surface)' }}
    >
      <div
        className="px-3 py-1.5 text-[11px] font-semibold tracking-wide flex-shrink-0"
        style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}
      >
        Change Orders — Navigation
      </div>

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
      </div>

      <div
        className="grid px-2 py-1 flex-shrink-0"
        style={{
          gridTemplateColumns: '90px 1fr 70px',
          background: 'var(--surface-alt)',
          borderBottom: '1px solid var(--border-strong)',
          fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}
      >
        <div>Change ID</div>
        <div>Description</div>
        <div style={{ textAlign: 'right' }}>Status</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {orders.map(order => (
          <ChangeNavRow
            key={order.id}
            order={order}
            isSelected={order.id === selectedId}
            onSelect={() => onSelect(order.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ChangeNavRow({ order, isSelected, onSelect }: { order: ChangeOrder; isSelected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className="grid items-center cursor-pointer"
      style={{
        gridTemplateColumns: '90px 1fr 70px',
        borderBottom: '1px solid var(--border)',
        background: isSelected ? 'var(--accent-soft)' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
        padding: '5px 8px',
      }}
    >
      <div className="num" style={{ fontSize: 11, color: isSelected ? 'var(--accent)' : 'var(--ink-2)', fontWeight: 600 }}>
        {order.change_code}
      </div>
      <div style={{ fontSize: 11, color: isSelected ? 'var(--ink-1)' : 'var(--ink-2)', paddingLeft: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {order.description ?? '—'}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          color: STATUS_COLOR[order.status] ?? 'var(--ink-muted)',
        }}>
          {order.status}
        </span>
      </div>
    </div>
  )
}
