import type { Project } from '../../types/projects'
import { fmt } from '../../lib/fmt'

interface Props { project: Project | null; height: number }

const labelSt: React.CSSProperties = { fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }
const fieldSt: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 2,
  padding: '2px 7px', fontSize: 11.5, color: 'var(--ink-1)', marginTop: 2, minHeight: 24,
  display: 'flex', alignItems: 'center',
}
const monoField: React.CSSProperties = { ...fieldSt, fontFamily: '"IBM Plex Mono", monospace' }
const sectionHeader: React.CSSProperties = {
  background: '#E0E0D6', borderRadius: '2px 2px 0 0',
  padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--ink-1)',
}

const fmtDate = (d: string | null) => d ? d.slice(0, 10) : '—'

export function ProjectDataPanel({ project, height }: Props) {
  if (!project) return (
    <div className="flex-shrink-0 flex items-center justify-center" style={{ height, color: 'var(--ink-muted)', fontSize: 12 }}>
      Select a project
    </div>
  )

  return (
    <div
      className="flex-shrink-0 overflow-y-auto"
      style={{ height, borderBottom: '2px solid var(--border-strong)', background: 'var(--app-bg)' }}
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide" style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}>
        Projects — Data
      </div>

      <div className="p-3 space-y-2.5">
        {/* Row 1: ID + Title + Currency + Multi-Currency */}
        <div className="flex gap-3">
          <div style={{ width: 180 }}>
            <div style={labelSt}>Project ID</div>
            <div style={{ ...monoField, color: 'var(--accent)', fontWeight: 600 }}>{project.code}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelSt}>Project Title</div>
            <div style={fieldSt}>{project.title}</div>
          </div>
          <div style={{ width: 80 }}>
            <div style={labelSt}>Currency</div>
            <div style={monoField}>{project.base_currency_code}</div>
          </div>
          <div style={{ width: 110 }}>
            <div style={labelSt}>Multi-Currency</div>
            <div style={fieldSt}>{project.multi_currency ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={labelSt}>Description</div>
          <div style={{ ...fieldSt, alignItems: 'flex-start', minHeight: 36, paddingTop: 4 }}>
            {project.description ?? '—'}
          </div>
        </div>

        {/* Scope of Work */}
        <div>
          <div style={labelSt}>Scope of Work</div>
          <div style={{ ...fieldSt, alignItems: 'flex-start', minHeight: 48, paddingTop: 4 }}>
            {project.scope_of_work ?? '—'}
          </div>
        </div>

        {/* Dates + Cost Summary */}
        <div className="flex gap-3">
          {/* Schedule dates */}
          <div style={{ flex: 1 }}>
            <div style={sectionHeader}>Schedule Dates</div>
            <div style={{ border: '1px solid var(--border-strong)', borderTop: 'none', borderRadius: '0 0 2px 2px', padding: '6px 8px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }}>
                <thead>
                  <tr>
                    <td style={{ width: 72 }} />
                    <td style={{ textAlign: 'center', fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 2 }}>Start</td>
                    <td style={{ textAlign: 'center', fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 2 }}>Finish</td>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Baseline', project.baseline_start, project.baseline_finish],
                    ['Control',  project.control_start,  project.control_finish],
                  ].map(([label, start, finish]) => (
                    <tr key={label as string}>
                      <td style={{ fontSize: 9.5, color: 'var(--ink-3)', paddingRight: 6, paddingTop: 2 }}>{label}</td>
                      <td className="num" style={{ textAlign: 'center', fontSize: 10, paddingTop: 2 }}>{fmtDate(start as string | null)}</td>
                      <td className="num" style={{ textAlign: 'center', fontSize: 10, paddingTop: 2 }}>{fmtDate(finish as string | null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost summary */}
          <div style={{ width: 200 }}>
            <div style={sectionHeader}>Cost Summary (USD)</div>
            <div style={{ border: '1px solid var(--border-strong)', borderTop: 'none', borderRadius: '0 0 2px 2px', padding: '6px 8px' }}>
              {[
                ['Budget (BAC)', project.cost_budget],
                ['Actual (AC)',  project.cost_actual],
                ['EAC',          project.cost_eac],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between items-center py-0.5">
                  <span style={{ fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                  <span className="num" style={{ fontSize: 11, fontWeight: 500 }}>{val != null ? fmt(val as number) : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
