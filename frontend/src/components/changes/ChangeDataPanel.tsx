import { Pencil } from 'lucide-react'
import type { ChangeOrderDetail } from '../../types/changes'
import { fmt, pctFmt } from '../../lib/fmt'

interface Props {
  detail: ChangeOrderDetail | undefined
  isLoading: boolean
  onEdit: () => void
}

const labelSt: React.CSSProperties = {
  fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
}
const fieldSt: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 2,
  padding: '2px 7px', fontSize: 11.5, color: 'var(--ink-1)', marginTop: 2, minHeight: 24,
  display: 'flex', alignItems: 'center',
}
const monoField: React.CSSProperties = {
  ...fieldSt, fontFamily: '"IBM Plex Mono", monospace',
}
const sectionHeader: React.CSSProperties = {
  background: '#E0E0D6', borderRadius: '2px 2px 0 0',
  padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--ink-1)',
}
const sectionBox: React.CSSProperties = {
  border: '1px solid var(--border-strong)', borderTop: 'none',
  borderRadius: '0 0 2px 2px', padding: '8px 12px',
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

const REASON_LABEL: Record<string, string> = {
  scope:          'Scope Change',
  design:         'Design Development',
  site_conditions:'Site Conditions',
  schedule:       'Schedule',
  rate:           'Rate Escalation',
  other:          'Other',
}

const IMPACT_LABEL: Record<string, string> = {
  cost:     'Cost Impact',
  schedule: 'Schedule Impact',
  both:     'Cost & Schedule',
  none:     'No Impact',
}

function fmtDate(dt: string | null): string {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

export function ChangeDataPanel({ detail, isLoading, onEdit }: Props) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
        Loading…
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
        Select a change order
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--app-bg)' }}>
      <div
        className="px-3 py-1.5 text-[11px] font-semibold tracking-wide flex items-center justify-between"
        style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}
      >
        <span>Change Orders — Data</span>
        <button
          onClick={onEdit}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2,
            padding: '2px 8px', cursor: 'pointer', color: 'var(--ink-2)',
          }}
        >
          <Pencil size={10} /> Edit
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Header row: code / impact / status */}
        <div className="flex gap-3 items-end">
          <div style={{ width: 120 }}>
            <div style={labelSt}>Change ID</div>
            <div style={{ ...monoField, color: 'var(--accent)', fontWeight: 700 }}>{detail.change_code}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelSt}>Impact Type</div>
            <div style={monoField}>{IMPACT_LABEL[detail.impact] ?? detail.impact}</div>
          </div>
          <div style={{ width: 100 }}>
            <div style={labelSt}>Status</div>
            <div style={{
              ...monoField,
              fontWeight: 700,
              color: STATUS_COLOR[detail.status] ?? 'var(--ink-1)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: 11,
            }}>
              {detail.status}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={labelSt}>Description</div>
          <div style={fieldSt}>{detail.description ?? '—'}</div>
        </div>

        {/* Details + Summary side by side */}
        <div className="flex gap-3">
          {/* Details */}
          <div style={{ flex: 2 }}>
            <div style={sectionHeader}>Details</div>
            <div style={sectionBox}>
              <div className="grid gap-x-4 gap-y-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {[
                  ['Change Reason', detail.reason ? (REASON_LABEL[detail.reason] ?? detail.reason) : '—'],
                  ['Request Date',  fmtDate(detail.request_date)],
                  ['Added Days',    detail.added_days != null ? String(detail.added_days) : '—'],
                  ['% Complete',    detail.pct_complete != null ? pctFmt(detail.pct_complete) : '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={labelSt}>{label}</div>
                    <div style={monoField}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={sectionHeader}>Summary</div>
            <div style={sectionBox}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '3px 0', textAlign: 'left', fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }} />
                    <th style={{ padding: '3px 8px', textAlign: 'right', fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Hours', fmt(detail.total_hour_impact)],
                    ['Cost',  fmt(detail.total_cost_impact)],
                  ].map(([label, val]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 0', fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</td>
                      <td className="num" style={{ padding: '5px 8px', textAlign: 'right', fontSize: 11, fontWeight: 600 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
