import {
  FileBarChart, GitBranch, LayoutGrid, Receipt, Settings2, CalendarRange,
} from 'lucide-react'
import type { Project } from '../../types/projects'

interface Props {
  screen: string
  setScreen: (s: string) => void
  project: Project | null
}

const NAV_ITEMS = [
  { id: 'setup',        label: 'Project Setup',     Icon: Settings2 },
  { id: 'cost-control', label: 'Cost Control',      Icon: LayoutGrid },
  { id: 'evm',          label: 'EVM Dashboard',     Icon: FileBarChart },
  { id: 'changes',      label: 'Change Management', Icon: GitBranch },
  { id: 'procurement',  label: 'Procurement',       Icon: Receipt },
  { id: 'reports',      label: 'Reports',           Icon: CalendarRange },
]

export function Sidebar({ screen, setScreen, project }: Props) {
  const bac = project?.cost_budget
  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col"
      style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-ink)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--sidebar-ink-muted)' }}>Project</div>
        <div className="mt-1 text-[15px] font-semibold leading-tight">
          {project?.code ?? 'Loading…'}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: 'var(--sidebar-ink-muted)' }}>
          <span>{project?.base_currency_code ?? 'USD'}</span>
          {bac != null && (
            <>
              <span>·</span>
              <span className="num">{(bac / 1_000_000).toFixed(1)}M BAC</span>
            </>
          )}
        </div>
      </div>

      <nav className="flex-1 py-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className="w-full flex items-center gap-3 px-5 py-2 text-[13px] text-left transition-colors"
            style={{
              background: screen === id ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: screen === id ? 'var(--sidebar-ink)' : 'var(--sidebar-ink-muted)',
              borderLeft: screen === id ? '2px solid #E8E8DE' : '2px solid transparent',
              fontWeight: screen === id ? 500 : 400,
            }}
          >
            <Icon size={15} strokeWidth={1.6} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="px-5 py-4 text-[10px] tracking-wider" style={{ color: 'var(--sidebar-ink-muted)', borderTop: '1px solid var(--sidebar-border)' }}>
        <div>F. VERA · COST ENGINEER</div>
        <div className="mt-1">v0.1 · training build</div>
      </div>
    </aside>
  )
}
