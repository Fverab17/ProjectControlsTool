import type { WbsRow } from '../../types/cost-control'
import { fmt, pctFmt } from '../../lib/fmt'

interface Props { row: WbsRow | null; period: string }

const labelSt: React.CSSProperties = { fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }
const fieldSt: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 2,
  padding: '2px 7px', fontSize: 11.5, color: 'var(--ink-1)', marginTop: 2, minHeight: 24,
  display: 'flex', alignItems: 'center',
}
const monoField: React.CSSProperties = { ...fieldSt, fontFamily: '"IBM Plex Mono", monospace' }
const sectionHeader: React.CSSProperties = { background: '#E0E0D6', borderRadius: '2px 2px 0 0', padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--ink-1)' }

export function AccountDataPanel({ row, period }: Props) {
  if (!row) {
    return (
      <div className="flex-shrink-0 flex items-center justify-center" style={{ height: 300, color: 'var(--ink-muted)', fontSize: 12 }}>
        Select a control account
      </div>
    )
  }

  const baselineBudget  = row.cost_budget * 0.92
  const approvedChanges = row.cost_budget * 0.08
  const periodIncurred  = row.cost_actual * 0.06

  return (
    <div
      className="flex-shrink-0 overflow-y-auto"
      style={{ height: 300, borderBottom: '2px solid var(--border-strong)', background: 'var(--app-bg)' }}
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide" style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}>
        Control Accounts — Data
      </div>

      <div className="p-3 space-y-2.5">
        {/* Row 1 */}
        <div className="flex gap-3">
          <div style={{ flex: 1 }}>
            <div style={labelSt}>Account ID (WBS)</div>
            <div style={{ ...monoField, color: 'var(--accent)', fontWeight: 600 }}>{row.code}</div>
          </div>
          <div style={{ width: 80 }}>
            <div style={labelSt}>Currency</div>
            <div style={monoField}>USD</div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={labelSt}>Description</div>
          <div style={fieldSt}>{row.description}</div>
        </div>

        {/* Misc fields */}
        <div className="flex gap-3">
          {[['Accounts in WBS', String(row.account_count)], ['Level', String(row.level + 1)], ['Period', period]].map(([label, val]) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={labelSt}>{label}</div>
              <div style={monoField}>{val}</div>
            </div>
          ))}
        </div>

        {/* Control Account Totals */}
        <div>
          <div style={sectionHeader}>Control Account Totals</div>
          <div style={{ border: '1px solid var(--border-strong)', borderTop: 'none', borderRadius: '0 0 2px 2px', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 860 }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: 55, padding: '4px 8px', textAlign: 'left', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }} />
                  {['Baseline Budget','Approved Changes','Approved Budget','Period Incurred','Incurred To Date','Open Commitment','Est. To Complete','Est. At Completion'].map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'right', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Hours', values: [baselineBudget, approvedChanges, row.cost_budget, periodIncurred, row.cost_actual, row.cost_open_commit, row.cost_etc, row.cost_eac].map(v => v * 0.028) },
                  { label: 'Cost',  values: [baselineBudget, approvedChanges, row.cost_budget, periodIncurred, row.cost_actual, row.cost_open_commit, row.cost_etc, row.cost_eac] },
                ].map(({ label, values }, ri) => (
                  <tr key={label} style={{ borderBottom: ri === 0 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '4px 8px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>{label}</td>
                    {values.map((v, i) => (
                      <td key={i} className="num" style={{ padding: '4px 8px', textAlign: 'right', fontSize: 11, fontWeight: i === 7 ? 600 : 400 }}>
                        {fmt(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex gap-3">
          {/* % Complete */}
          <div style={{ flexShrink: 0, width: 150 }}>
            <div style={sectionHeader}>Percent Complete</div>
            <div style={{ border: '1px solid var(--border-strong)', borderTop: 'none', borderRadius: '0 0 2px 2px', padding: '6px 8px' }}>
              {[
                ['Current',  pctFmt(row.pct_complete), 'var(--accent)'],
                ['Previous', pctFmt(Math.max(0, row.pct_complete - 0.04)), null],
                ['Method',   'Manual', null],
              ].map(([k, v, color]) => (
                <div key={k as string} className="flex justify-between items-center py-0.5">
                  <span style={{ fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</span>
                  <span className="num" style={{ fontSize: 11, fontWeight: k === 'Current' ? 600 : 400, color: (color as string) ?? 'var(--ink-1)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* EVM Summary */}
          <div style={{ flex: 1 }}>
            <div style={sectionHeader}>EVM Summary</div>
            <div style={{ border: '1px solid var(--border-strong)', borderTop: 'none', borderRadius: '0 0 2px 2px', padding: '6px 8px' }}>
              <div className="grid gap-y-1" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                {[
                  ['BAC', fmt(row.cost_budget)],
                  ['EV',  fmt(row.cost_earned)],
                  ['AC',  fmt(row.cost_actual)],
                  ['ETC', fmt(row.cost_etc)],
                  ['EAC', fmt(row.cost_eac)],
                  ['VAC', fmt(row.vac)],
                  ['CPI', row.cpi.toFixed(2)],
                  ['Commit', fmt(row.cost_open_commit)],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span style={{ fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</span>
                    <span className="num" style={{ fontSize: 11, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
