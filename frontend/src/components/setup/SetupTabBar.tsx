import { GitBranch, Tag, Package, Upload, CalendarRange } from 'lucide-react'

export type SetupTab = 'wbs' | 'cbs' | 'packages' | 'budget' | 'periods'

interface Props {
  activeTab: SetupTab
  setActiveTab: (tab: SetupTab) => void
}

const TABS: Array<{ id: SetupTab; label: string; icon: React.ElementType }> = [
  { id: 'wbs',      label: 'Work Breakdown (WBS)', icon: GitBranch },
  { id: 'cbs',      label: 'Cost Breakdown (CBS)',  icon: Tag },
  { id: 'packages', label: 'Packages',              icon: Package },
  { id: 'budget',   label: 'Budget Import',          icon: Upload },
  { id: 'periods',  label: 'Periods',                icon: CalendarRange },
]

export function SetupTabBar({ activeTab, setActiveTab }: Props) {
  return (
    <div
      className="flex items-end flex-shrink-0 px-3 gap-1"
      style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)' }}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium"
            style={{
              background: isActive ? 'var(--surface)' : 'transparent',
              border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
              borderBottom: isActive ? '1px solid var(--surface)' : '1px solid transparent',
              borderRadius: '2px 2px 0 0',
              color: isActive ? 'var(--ink-1)' : 'var(--ink-3)',
              marginBottom: isActive ? -1 : 0,
              cursor: 'pointer',
            }}
          >
            <Icon size={11} style={{ color: isActive ? 'var(--accent)' : 'var(--ink-muted)' }} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
