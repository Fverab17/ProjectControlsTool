import { CalendarRange, Download } from 'lucide-react'

interface Props {
  screen: string
  period: string
  setPeriod: (p: string) => void
}

const LABELS: Record<string, string> = {
  'cost-control': 'Cost Control',
  setup: 'Project Setup',
  evm: 'EVM Dashboard',
  changes: 'Change Management',
  procurement: 'Procurement',
  reports: 'Reports',
}

const PERIODS = ['2024-01','2024-02','2024-03','2024-04','2024-05','2024-06']

export function TopBar({ screen, period, setPeriod }: Props) {
  return (
    <header
      className="h-[48px] flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <div className="text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>Module</div>
        <div className="text-[14px] font-semibold">{LABELS[screen] ?? screen}</div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-1.5 text-[12px]"
          style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 3 }}
        >
          <CalendarRange size={13} style={{ color: 'var(--ink-3)' }} />
          <span style={{ color: 'var(--ink-3)' }}>Period</span>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="bg-transparent border-0 font-medium num text-[12px] outline-none cursor-pointer"
            style={{ color: 'var(--ink-1)' }}
          >
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button
          className="px-3 py-1.5 text-[12px] flex items-center gap-2"
          style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--ink-2)' }}
        >
          <Download size={13} />Export
        </button>
      </div>
    </header>
  )
}
