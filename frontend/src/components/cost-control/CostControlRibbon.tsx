import { ArrowUpDown, Calculator, Download, FileBarChart, Filter, Plus, Settings2, TrendingUp, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface RibbonItem { icon: LucideIcon; label: string }
interface RibbonGroup { label: string; items: RibbonItem[] }

const GROUPS: RibbonGroup[] = [
  {
    label: 'Data Entry',
    items: [
      { icon: Plus,        label: 'Add' },
      { icon: Trash2,      label: 'Delete' },
      { icon: Settings2,   label: 'Settings' },
    ],
  },
  {
    label: 'Calculations',
    items: [
      { icon: Calculator,  label: 'Calculate\nTotals' },
      { icon: ArrowUpDown, label: 'Spread\nBudgets' },
      { icon: TrendingUp,  label: 'Spread\nETC/Earned' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { icon: FileBarChart, label: 'Reports' },
      { icon: Download,     label: 'Export' },
      { icon: Filter,       label: 'Filter' },
    ],
  },
]

export function CostControlRibbon() {
  return (
    <div
      className="flex items-stretch flex-shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border-strong)', minHeight: 62 }}
    >
      {GROUPS.map((group, gi) => (
        <div key={group.label} className="flex">
          <div className="flex flex-col">
            <div className="flex items-start gap-0.5 px-3 pt-2 pb-1 flex-1">
              {group.items.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ minWidth: 50 }}
                >
                  <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                  <span
                    className="text-[9.5px] text-center leading-tight"
                    style={{ color: 'var(--ink-2)', whiteSpace: 'pre-line' }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
            <div className="text-[8.5px] tracking-[0.14em] uppercase text-center pb-1.5" style={{ color: 'var(--ink-muted)' }}>
              {group.label}
            </div>
          </div>
          {gi < GROUPS.length - 1 && (
            <div className="w-px my-2 mx-1 flex-shrink-0" style={{ background: 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}
