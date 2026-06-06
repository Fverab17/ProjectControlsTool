import { Download, FolderOpen, Plus, Settings2, Trash2 } from 'lucide-react'

interface Props { onOpen: () => void }

const GROUPS = [
  {
    label: 'Data Entry',
    items: [
      { icon: Plus,       label: 'New Project' },
      { icon: Trash2,     label: 'Delete' },
      { icon: Settings2,  label: 'Settings' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { icon: FolderOpen, label: 'Open Project', primary: true },
      { icon: Download,   label: 'Export' },
    ],
  },
]

export function ProjectsRibbon({ onOpen }: Props) {
  return (
    <div
      className="flex items-stretch flex-shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border-strong)', minHeight: 62 }}
    >
      {GROUPS.map((group, gi) => (
        <div key={group.label} className="flex">
          <div className="flex flex-col">
            <div className="flex items-start gap-0.5 px-3 pt-2 pb-1 flex-1">
              {group.items.map(({ icon: Icon, label, primary }) => (
                <button
                  key={label}
                  onClick={label === 'Open Project' ? onOpen : undefined}
                  className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded transition-colors"
                  style={{
                    minWidth: 52,
                    background: primary ? 'var(--accent-soft)' : 'transparent',
                    border: primary ? '1px solid var(--accent)' : '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (!primary) e.currentTarget.style.background = 'var(--surface-hover)' }}
                  onMouseLeave={e => { if (!primary) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={18} strokeWidth={1.5} style={{ color: primary ? 'var(--accent)' : 'var(--accent)' }} />
                  <span className="text-[9.5px] text-center leading-tight" style={{ color: 'var(--ink-2)', whiteSpace: 'pre-line', fontWeight: primary ? 600 : 400 }}>
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
