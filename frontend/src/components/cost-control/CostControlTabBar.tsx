import { LayoutGrid, X } from 'lucide-react'

export function CostControlTabBar() {
  return (
    <div
      className="flex items-end flex-shrink-0 px-3 gap-1"
      style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] font-medium"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderBottom: '1px solid var(--surface)',
          borderRadius: '2px 2px 0 0',
          color: 'var(--ink-1)',
          marginBottom: -1,
        }}
      >
        <LayoutGrid size={11} style={{ color: 'var(--accent)' }} />
        Control Accounts
        <button className="opacity-30 hover:opacity-80 ml-1" style={{ color: 'var(--ink-2)' }}>
          <X size={11} />
        </button>
      </div>
    </div>
  )
}
