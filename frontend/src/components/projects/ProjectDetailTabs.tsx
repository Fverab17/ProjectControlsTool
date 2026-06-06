import type { ProjectDetail } from '../../types/projects'

interface Props { detail: ProjectDetail | null; tab: string; setTab: (t: string) => void }

const TABS = [
  { id: 'members', label: 'User Permissions' },
  { id: 'periods', label: 'Periods' },
  { id: 'summary', label: 'Breakdown Summary' },
]

const ROLE_LABELS: Record<string, string> = {
  pm: 'Project Manager',
  cost_engineer: 'Cost Engineer',
  scheduler: 'Scheduler',
  controller: 'Controller',
  viewer: 'Viewer',
}

export function ProjectDetailTabs({ detail, tab, setTab }: Props) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        className="flex items-end flex-shrink-0 px-2"
        style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)' }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '5px 12px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
              background: tab === id ? 'var(--surface)' : 'transparent',
              color: tab === id ? 'var(--ink-1)' : 'var(--ink-3)',
              fontWeight: tab === id ? 500 : 400,
              border: '1px solid', borderColor: tab === id ? 'var(--border-strong)' : 'transparent',
              borderBottom: tab === id ? '1px solid var(--surface)' : '1px solid transparent',
              borderRadius: '2px 2px 0 0', marginBottom: tab === id ? -1 : 0,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--surface)' }}>
        {!detail ? (
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Select a project to view details</div>
        ) : tab === 'members' ? (
          <MembersTab detail={detail} />
        ) : tab === 'periods' ? (
          <PeriodsTab detail={detail} />
        ) : (
          <SummaryTab detail={detail} />
        )}
      </div>
    </div>
  )
}

function MembersTab({ detail }: { detail: ProjectDetail }) {
  const thSt: React.CSSProperties = { padding: '5px 10px', fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)', textAlign: 'left' }
  const tdSt: React.CSSProperties = { padding: '5px 10px', fontSize: 11 }

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)' }}>
          <th style={thSt}>Name</th>
          <th style={thSt}>Email</th>
          <th style={thSt}>Project Role</th>
        </tr>
      </thead>
      <tbody>
        {detail.members.map(m => (
          <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ ...tdSt, fontWeight: 500 }}>{m.user_name}</td>
            <td style={{ ...tdSt, color: 'var(--ink-3)' }}>{m.user_email}</td>
            <td style={tdSt}>
              <span
                className="px-2 py-0.5 text-[10px] uppercase tracking-wide"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 2, fontWeight: 500 }}
              >
                {ROLE_LABELS[m.project_role] ?? m.project_role}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PeriodsTab({ detail }: { detail: ProjectDetail }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
      <div className="flex gap-8">
        {[
          ['Reporting Periods', detail.period_count],
          ['Cost Accounts', detail.account_count],
          ['WBS Nodes', detail.wbs_node_count],
        ].map(([label, val]) => (
          <div key={label as string}>
            <div style={{ fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
            <div className="num" style={{ fontSize: 24, fontWeight: 600, color: 'var(--accent)' }}>{val}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
        Full period list available in Project Setup → Reporting Periods.
      </div>
    </div>
  )
}

function SummaryTab({ detail }: { detail: ProjectDetail }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[
          ['WBS Nodes', detail.wbs_node_count, 'Work breakdown structure'],
          ['Cost Accounts', detail.account_count, 'Control accounts in this project'],
          ['Reporting Periods', detail.period_count, 'Monthly time buckets'],
          ['Team Members', detail.members.length, 'Users with project access'],
        ].map(([label, val, desc]) => (
          <div key={label as string} style={{ border: '1px solid var(--border)', borderRadius: 3, padding: '10px 14px' }}>
            <div className="num" style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent)' }}>{val}</div>
            <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{label}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 1 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
