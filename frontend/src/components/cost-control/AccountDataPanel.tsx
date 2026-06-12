import { useState } from 'react'
import type { WbsRow, EtcMethod } from '../../types/cost-control'
import { ETC_METHOD_LABELS, ETC_METHOD_FORMULA, PCT_METHOD_LABELS } from '../../types/cost-control'
import { fmt, pctFmt } from '../../lib/fmt'
import { API_BASE } from '../../lib/api'

// ---------------------------------------------------------------------------
// Mock package lookup — derives package assignment from WBS code until the
// packages API populates package_code / package_description on WbsRow
// ---------------------------------------------------------------------------
function derivePackage(wbsCode: string): { code: string; description: string } | null {
  const segs = wbsCode.split('.')
  const s0 = segs[0]
  const s1 = segs.slice(0, 2).join('.')
  if (s0 === '1') return { code: 'P1',    description: 'PMT' }
  if (s0 === '2') {
    if (s1 === '2.1') return { code: 'P2.01', description: 'Process Engineering Package' }
    if (s1 === '2.2') return { code: 'P2.02', description: 'Civil & Structural Package' }
    if (s1 === '2.3') return { code: 'P2.03', description: 'Mechanical Engineering Package' }
    if (s1 === '2.4') return { code: 'P2.04', description: 'Electrical Engineering Package' }
    if (s1 === '2.5') return { code: 'P2.05', description: 'I&C Engineering Package' }
    return { code: 'P2', description: 'Engineering & Design' }
  }
  if (s0 === '3') return { code: 'P3',    description: 'Procurement' }
  if (s0 === '4') {
    if (s1 === '4.1') return { code: 'P4.01', description: 'Civil & Foundation Package' }
    if (s1 === '4.2') return { code: 'P4.02', description: 'Structural Steel Package' }
    if (s1 === '4.3') return { code: 'P4.03', description: 'Mechanical Installation Package' }
    if (s1 === '4.4') return { code: 'P4.04', description: 'Electrical & I&C Package' }
    if (s1 === '4.5') return { code: 'P4.05', description: 'Commissioning Package' }
    return { code: 'P4', description: 'Construction' }
  }
  if (s0 === '5') return { code: 'P4.05', description: 'Commissioning Package' }
  if (s0 === '6') return { code: 'P5',    description: 'Allowances & Contingencies' }
  return null
}

interface Props {
  row: WbsRow | null
  period: string
  projectId: string
  height: number
  onAccountUpdated?: (accountId: string, etcMethod: EtcMethod) => void
}

const labelSt: React.CSSProperties = { fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }
const fieldSt: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 2,
  padding: '2px 7px', fontSize: 11.5, color: 'var(--ink-1)', marginTop: 2, minHeight: 24,
  display: 'flex', alignItems: 'center',
}
const monoField: React.CSSProperties = { ...fieldSt, fontFamily: '"IBM Plex Mono", monospace' }
const sectionHeader: React.CSSProperties = { background: '#E0E0D6', borderRadius: '2px 2px 0 0', padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--ink-1)' }

const ETC_METHODS: EtcMethod[] = ['manual', 'budget_remaining', 'performance_factor', 'commitments', 'closed']

export function AccountDataPanel({ row, period, projectId, height, onAccountUpdated }: Props) {
  const [saving, setSaving] = useState(false)

  if (!row) {
    return (
      <div className="flex-shrink-0 flex items-center justify-center" style={{ height, color: 'var(--ink-muted)', fontSize: 12 }}>
        Select a control account
      </div>
    )
  }

  // Capture non-null row for use inside async callbacks
  const account = row
  const isAccount = !!account.account_code

  // Package: use API field when available, fall back to derived mock
  const pkg = account.package_code
    ? { code: account.package_code, description: account.package_description ?? '' }
    : derivePackage(account.code)
  const etcMethod = (account.etc_method ?? 'manual') as EtcMethod

  const approvedChanges = account.cost_approved_changes ?? 0
  const baselineBudget  = account.cost_budget - approvedChanges
  const periodIncurred  = account.cost_period_incurred

  async function handleEtcMethodChange(method: EtcMethod) {
    if (!isAccount) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/projects/${projectId}/cost-accounts/${account.wbs_node_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etc_method: method }),
      })
      onAccountUpdated?.(account.wbs_node_id, method)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="flex-shrink-0 overflow-y-auto"
      style={{ height, borderBottom: '2px solid var(--border-strong)', background: 'var(--app-bg)' }}
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide" style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}>
        Control Accounts — Data
      </div>

      <div className="p-3 space-y-2.5">
        {/* Row 1 — Account ID / ETC Method / Currency */}
        <div className="flex gap-3 items-end">
          <div style={{ flex: 1 }}>
            <div style={labelSt}>Account ID (WBS)</div>
            <div style={{ ...monoField, color: 'var(--accent)', fontWeight: 600 }}>{account.code}</div>
          </div>

          {/* ETC Forecast Method — only on cost-account rows */}
          {isAccount && (
            <div style={{ width: 220 }}>
              <div style={labelSt}>ETC Forecast Method</div>
              <select
                value={etcMethod}
                disabled={saving}
                onChange={e => handleEtcMethodChange(e.target.value as EtcMethod)}
                style={{
                  ...fieldSt,
                  marginTop: 2,
                  width: '100%',
                  padding: '2px 6px',
                  fontSize: 11,
                  color: saving ? 'var(--ink-muted)' : 'var(--ink-1)',
                  cursor: saving ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  appearance: 'auto',
                }}
              >
                {ETC_METHODS.map(m => (
                  <option key={m} value={m}>{ETC_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Formula hint */}
          {isAccount && (
            <div style={{ flexShrink: 0, maxWidth: 260 }}>
              <div style={labelSt}>Formula</div>
              <div style={{
                ...fieldSt,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10,
                color: 'var(--ink-3)',
                whiteSpace: 'nowrap',
              }}>
                {ETC_METHOD_FORMULA[etcMethod]}
              </div>
            </div>
          )}

          <div style={{ width: 60, flexShrink: 0 }}>
            <div style={labelSt}>Currency</div>
            <div style={monoField}>USD</div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={labelSt}>Description</div>
          <div style={fieldSt}>{account.description}</div>
        </div>

        {/* Misc fields */}
        <div className="flex gap-3">
          {[['Accounts in WBS', String(account.account_count)], ['Level', String(account.level + 1)], ['Period', period]].map(([label, val]) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={labelSt}>{label}</div>
              <div style={monoField}>{val}</div>
            </div>
          ))}

          {/* Package */}
          {pkg && (
            <div style={{ flex: 2 }}>
              <div style={labelSt}>Package</div>
              <div style={{ ...fieldSt, gap: 6 }}>
                <span
                  className="num"
                  style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 2, flexShrink: 0 }}
                >
                  {pkg.code}
                </span>
                <span style={{ fontSize: 11, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pkg.description}
                </span>
              </div>
            </div>
          )}
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
                  { label: 'Hours', values: [baselineBudget, approvedChanges, account.cost_budget, periodIncurred, account.cost_actual, account.cost_open_commit, account.cost_etc, account.cost_eac].map(v => v * 0.028) },
                  { label: 'Cost',  values: [baselineBudget, approvedChanges, account.cost_budget, periodIncurred, account.cost_actual, account.cost_open_commit, account.cost_etc, account.cost_eac] },
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
              {([
                ['Current',  pctFmt(account.pct_complete), 'var(--accent)'],
                ['Previous', pctFmt(Math.max(0, account.pct_complete - 0.04)), null],
                ['Method',   PCT_METHOD_LABELS[account.pct_complete_method as keyof typeof PCT_METHOD_LABELS] ?? account.pct_complete_method ?? 'Manual', null],
              ] as [string, string, string | null][]).map(([k, v, color]) => (
                <div key={k} className="flex justify-between items-center py-0.5">
                  <span style={{ fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</span>
                  <span className="num" style={{ fontSize: 11, fontWeight: k === 'Current' ? 600 : 400, color: color ?? 'var(--ink-1)' }}>{v}</span>
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
                  ['BAC', fmt(account.cost_budget)],
                  ['EV',  fmt(account.cost_earned)],
                  ['AC',  fmt(account.cost_actual)],
                  ['ETC', fmt(account.cost_etc)],
                  ['EAC', fmt(account.cost_eac)],
                  ['VAC', fmt(account.vac)],
                  ['CPI', account.cpi.toFixed(2)],
                  ['Commit', fmt(account.cost_open_commit)],
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
