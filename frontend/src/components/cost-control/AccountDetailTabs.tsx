import type { WbsRow } from '../../types/cost-control'
import { fmt } from '../../lib/fmt'
import { useAccountChanges, useWbsChanges } from '../../hooks/useChangeOrders'

interface Props { projectId: string; row: WbsRow | null; tab: string; setTab: (t: string) => void }

const TABS = [
  { id: 'groups',      label: 'Groups / Breakdown Structures' },
  { id: 'cost',        label: 'TP Cost' },
  { id: 'budget',      label: 'Budget Details' },
  { id: 'changes',     label: 'Changes' },
  { id: 'commitments', label: 'Commitments' },
]

export function AccountDetailTabs({ projectId, row, tab, setTab }: Props) {
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
              padding: '5px 12px', fontSize: 11, cursor: 'pointer',
              background: tab === id ? 'var(--surface)' : 'transparent',
              color: tab === id ? 'var(--ink-1)' : 'var(--ink-3)',
              fontWeight: tab === id ? 500 : 400,
              border: '1px solid', borderColor: tab === id ? 'var(--border-strong)' : 'transparent',
              borderBottom: tab === id ? '1px solid var(--surface)' : '1px solid transparent',
              borderRadius: '2px 2px 0 0', marginBottom: tab === id ? -1 : 0, whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--surface)' }}>
        {!row ? (
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No account selected</div>
        ) : tab === 'groups' ? <GroupsTab row={row} />
          : tab === 'cost'   ? <TpCostTab row={row} />
          : tab === 'budget' ? <BudgetTab row={row} />
          : tab === 'changes' ? <ChangesTab projectId={projectId} row={row} />
          : tab === 'commitments' ? <CommitmentsTab row={row} />
          : null}
      </div>
    </div>
  )
}

// ── Groups tab ──────────────────────────────────────────────────────────────

function GroupsTab({ row }: { row: WbsRow }) {
  // For CA rows, the WBS parent is the node this account belongs to.
  // For WBS rollup rows, the row itself is the WBS node.
  const isCA = row.account_code != null
  const wbsCode = isCA ? (row.parent_code ?? row.code) : row.code
  const wbsDesc = isCA ? (row.wbs_node_description ?? '') : row.description

  const cbsByLevel0: Record<string, [string, string]> = {
    '1': ['L.E','Engineering Labor'], '2': ['M.E','Major Equipment'],
    '3': ['L.C','Construction Labor'], '4': ['L.E','Commissioning Engineering'],
    '5': ['L.M','Management Labor'], '6': ['E.O','Other Direct Costs'],
  }
  const level0 = wbsCode.split('.')[0]
  const [cbsCode, cbsDesc] = cbsByLevel0[level0] ?? ['M.B','Bulk Materials']

  const rows = [
    ['Cost Breakdown Structure', 'CBS',    cbsCode,  cbsDesc],
    ['Work Breakdown Structure', 'WBS',    wbsCode,  wbsDesc],
    ['Package Type',            'Module', '2',        '2. Engineering & Procurement'],
    ['Cost Controller',         'Module', '01',       'F. Vera'],
    ['Package Status',          'Module', '2',        '2-ACTIVE'],
  ]

  return (
    <TabTable headers={['Title','Type','ID','Description']} rows={rows} />
  )
}

// ── TP Cost tab ─────────────────────────────────────────────────────────────

function TpCostTab({ row }: { row: WbsRow }) {
  const PERIODS = Array.from({ length: 12 }, (_, i) => `2023-${String(i + 1).padStart(2, '0')}`)
  const bell = PERIODS.map((_, i) => Math.exp(-((i/12 - 0.45)**2) / (2*0.18**2)))
  const bellSum = bell.reduce((s, v) => s + v, 0)
  const w = bell.map(v => v / bellSum)
  const filled = Math.min(12, Math.ceil(12 * row.pct_complete * 0.85))
  const filledSum = w.slice(0, filled).reduce((s, v) => s + v, 0) || 1

  const budgetVals = w.map(wi => wi * row.cost_budget)
  const actualVals = w.map((wi, i) => i < filled ? (wi / filledSum) * row.cost_actual : 0)
  const earnedVals = w.map((wi, i) => i < filled ? (wi / filledSum) * row.cost_earned : 0)

  const tableRows = [
    { label: 'Budget (Control)', values: budgetVals, color: undefined },
    { label: 'Actual (AC)',      values: actualVals, color: 'var(--ink-negative)' },
    { label: 'Earned (EV)',      values: earnedVals, color: 'var(--ink-positive)' },
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 900 }}>
        <thead>
          <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)' }}>
            <th style={{ width: 140, padding: '5px 10px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--surface-alt)', fontSize: 9.5, color: 'var(--ink-3)' }} />
            {PERIODS.map(p => (
              <th key={p} className="num" style={{ padding: '5px 8px', textAlign: 'right', fontSize: 9.5, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{p}</th>
            ))}
            <th className="num" style={{ padding: '5px 10px', textAlign: 'right', fontSize: 9.5, color: 'var(--ink-3)', position: 'sticky', right: 0, background: 'var(--surface-alt)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map(({ label, values, color }) => (
            <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '5px 10px', position: 'sticky', left: 0, background: 'var(--surface)', fontSize: 11 }}>{label}</td>
              {values.map((v, i) => (
                <td key={i} className="num" style={{ padding: '5px 8px', textAlign: 'right', fontSize: 11, color: v < 1 ? 'var(--ink-muted)' : color }}>
                  {v < 1 ? '—' : fmt(v)}
                </td>
              ))}
              <td className="num" style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600, fontSize: 11, color, position: 'sticky', right: 0, background: 'var(--surface)' }}>
                {fmt(values.reduce((s, v) => s + v, 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 6 }}>Showing FY 2023 · 12 of 36 periods · {/* TODO: wire to real TP data */} mock distribution</div>
    </div>
  )
}

// ── Budget Details tab ───────────────────────────────────────────────────────

function BudgetTab({ row }: { row: WbsRow }) {
  const lines = [
    ['Direct cost allocation',        fmt(row.cost_budget * 0.70)],
    ['Indirect & overhead',           fmt(row.cost_budget * 0.20)],
    ['Contingency reserve',           fmt(row.cost_budget * 0.10)],
  ]
  return (
    <TabTable
      headers={['Description','Cost']}
      rows={lines}
      rightCols={[1]}
      footer={['Total', fmt(row.cost_budget)]}
    />
  )
}

// ── Changes tab ──────────────────────────────────────────────────────────────

function ChangesTab({ projectId, row }: { projectId: string; row: WbsRow }) {
  const isCA = row.account_code != null
  const accountResult = useAccountChanges(projectId, isCA ? row.account_code : null)
  const wbsResult = useWbsChanges(projectId, isCA ? null : row.code)
  const { data: changes = [], isLoading } = isCA ? accountResult : wbsResult

  if (isLoading) return <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Loading…</div>
  if (changes.length === 0) return <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No change orders for this {isCA ? 'control account' : 'WBS node'}.</div>

  const STATUS_COLOR: Record<string, string> = {
    approved: 'var(--ink-positive)', submitted: '#D97706',
    pending: '#6B7280', cancelled: 'var(--ink-negative)',
  }

  const totalHours = changes.reduce((s, c) => s + c.total_hour_impact, 0)
  const totalCost  = changes.reduce((s, c) => s + c.total_cost_impact, 0)

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
      <thead>
        <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)' }}>
          {['Code', 'Description', 'Status', 'Hours Impact', 'Cost Impact', 'Date'].map((h, i) => (
            <th key={h} style={{ padding: '5px 10px', fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {changes.map(c => (
          <tr key={c.change_code} style={{ borderBottom: '1px solid var(--border)' }}>
            <td className="num" style={{ padding: '5px 10px', fontWeight: 600, color: 'var(--accent)' }}>{c.change_code}</td>
            <td style={{ padding: '5px 10px' }}>{c.description ?? '—'}</td>
            <td style={{ padding: '5px 10px' }}>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: STATUS_COLOR[c.status] ?? 'var(--ink-3)' }}>
                {c.status}
              </span>
            </td>
            <td className="num" style={{ padding: '5px 10px', textAlign: 'right' }}>{fmt(c.total_hour_impact)}</td>
            <td className="num" style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(c.total_cost_impact)}</td>
            <td className="num" style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--ink-3)' }}>
              {c.request_date ? new Date(c.request_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: 'var(--surface-alt)', borderTop: '1px solid var(--border-strong)' }}>
          <td colSpan={3} style={{ padding: '5px 10px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--ink-3)' }}>
            Total ({changes.length} change{changes.length !== 1 ? 's' : ''})
          </td>
          <td className="num" style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(totalHours)}</td>
          <td className="num" style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(totalCost)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  )
}

// ── Commitments tab ──────────────────────────────────────────────────────────

function CommitmentsTab({ row }: { row: WbsRow }) {
  const rows = [
    ['CTR-0042','Fluor Engineering','1','2022-03',fmt(row.cost_budget * 0.45),'✓'],
    ['CTR-0108','Bechtel Supply Co.','2','2022-08',fmt(row.cost_budget * 0.30),'✓'],
    ['CTR-0201','KBR Construction','1','2023-01',fmt(row.cost_budget * 0.15),'Pending'],
  ]
  return <TabTable headers={['Contract','Vendor','Item','Period','Cost','Status']} rows={rows} rightCols={[4]} />
}

// ── Shared table component ───────────────────────────────────────────────────

interface TableProps {
  headers: string[]
  rows: string[][]
  rightCols?: number[]
  footer?: string[]
}

function TabTable({ headers, rows, rightCols = [], footer }: TableProps) {
  const thSt = (i: number): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase',
    color: 'var(--ink-3)', textAlign: rightCols.includes(i) ? 'right' : 'left',
  })
  const tdSt = (i: number): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 11, textAlign: rightCols.includes(i) ? 'right' : 'left',
  })
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
      <thead>
        <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)' }}>
          {headers.map((h, i) => <th key={h} style={thSt(i)}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
            {row.map((cell, ci) => <td key={ci} style={tdSt(ci)}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
      {footer && (
        <tfoot>
          <tr style={{ background: 'var(--surface-alt)', borderTop: '1px solid var(--border-strong)' }}>
            <td colSpan={headers.length - 1} style={{ padding: '5px 10px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--ink-3)' }}>{footer[0]}</td>
            <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600, fontSize: 11 }}>{footer[1]}</td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}
