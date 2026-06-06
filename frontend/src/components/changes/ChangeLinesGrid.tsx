import { useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { ChangeLine } from '../../types/changes'
import { fmt } from '../../lib/fmt'
import { useAddChangeLine, useDeleteChangeLine, useUpdateChangeLine } from '../../hooks/useChangeOrders'

interface Props {
  projectId: string
  coId: string | null
  lines: ChangeLine[]
}

const thSt: React.CSSProperties = {
  padding: '5px 10px', textAlign: 'left', fontSize: 9.5,
  letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)',
  whiteSpace: 'nowrap', fontWeight: 600,
}
const tdSt: React.CSSProperties = { padding: '5px 10px', fontSize: 11 }
const inputSt: React.CSSProperties = {
  width: '100%', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11,
  border: '1px solid var(--border-strong)', borderRadius: 2,
  padding: '1px 5px', textAlign: 'right', background: 'var(--surface)',
  color: 'var(--ink-1)', outline: 'none',
}
const iconBtn = (color?: string): React.CSSProperties => ({
  background: 'none', border: 'none', cursor: 'pointer',
  color: color ?? 'var(--ink-3)', padding: 2, display: 'flex', alignItems: 'center',
})
const headerBtn = (accent?: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, borderRadius: 2,
  padding: '2px 8px', cursor: 'pointer', fontWeight: accent ? 600 : 400,
  background: accent ? 'var(--accent)' : 'var(--surface)',
  color: accent ? '#fff' : 'var(--ink-2)',
  border: accent ? 'none' : '1px solid var(--border)',
})

export function ChangeLinesGrid({ projectId, coId, lines }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  // map of lineId -> draft { hours, cost } strings
  const [edits, setEdits] = useState<Record<string, { hours: string; cost: string }>>({})
  // new-row draft, independent of edit mode
  const [newRow, setNewRow] = useState<{ account_code: string; hours: string; cost: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addLine    = useAddChangeLine(projectId, coId ?? '')
  const updateLine = useUpdateChangeLine(projectId, coId ?? '')
  const deleteLine = useDeleteChangeLine(projectId, coId ?? '')

  function enterEdit() {
    const draft: Record<string, { hours: string; cost: string }> = {}
    for (const l of lines) {
      draft[l.id] = { hours: String(l.hour_impact), cost: String(l.cost_impact) }
    }
    setEdits(draft)
    setError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setEdits({})
    setError(null)
  }

  async function saveEdits() {
    setError(null)
    try {
      const changed = lines.filter(l => {
        const e = edits[l.id]
        return e && (parseFloat(e.hours) !== l.hour_impact || parseFloat(e.cost) !== l.cost_impact)
      })
      await Promise.all(
        changed.map(l =>
          updateLine.mutateAsync({
            lineId: l.id,
            hour_impact: parseFloat(edits[l.id].hours) || 0,
            cost_impact: parseFloat(edits[l.id].cost) || 0,
          })
        )
      )
      setIsEditing(false)
      setEdits({})
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function confirmAdd() {
    if (!newRow || !coId) return
    setError(null)
    try {
      await addLine.mutateAsync({
        account_code: newRow.account_code.trim().toUpperCase(),
        hour_impact: parseFloat(newRow.hours) || 0,
        cost_impact: parseFloat(newRow.cost) || 0,
      })
      setNewRow(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Add failed')
    }
  }

  async function handleDelete(lineId: string) {
    setError(null)
    try {
      await deleteLine.mutateAsync(lineId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  // Live totals reflect in-progress edits and the unsaved new row
  const totalHours = lines.reduce((s, l) => {
    const e = edits[l.id]
    return s + (isEditing && e ? parseFloat(e.hours) || 0 : l.hour_impact)
  }, 0) + (newRow ? parseFloat(newRow.hours) || 0 : 0)

  const totalCost = lines.reduce((s, l) => {
    const e = edits[l.id]
    return s + (isEditing && e ? parseFloat(e.cost) || 0 : l.cost_impact)
  }, 0) + (newRow ? parseFloat(newRow.cost) || 0 : 0)

  const hasActionCol = isEditing || !!newRow
  const colSpanLabel = 3  // #, Account ID, Description always span 3 for the total label

  return (
    <div
      className="flex-shrink-0 flex flex-col"
      style={{ height: 220, borderTop: '2px solid var(--border-strong)', background: 'var(--surface)' }}
    >
      {/* ── Header ── */}
      <div
        className="px-3 py-1.5 text-[11px] font-semibold tracking-wide flex-shrink-0 flex items-center justify-between"
        style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}
      >
        <span>Change Orders — Control Accounts</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {isEditing ? (
            <>
              <button
                style={headerBtn()}
                onClick={() => setNewRow({ account_code: '', hours: '0', cost: '0' })}
                disabled={!!newRow || !coId}
              >
                <Plus size={10} /> Add Row
              </button>
              <button
                style={headerBtn(true)}
                onClick={saveEdits}
                disabled={updateLine.isPending}
              >
                <Check size={10} /> Save
              </button>
              <button style={headerBtn()} onClick={cancelEdit}>
                <X size={10} /> Cancel
              </button>
            </>
          ) : (
            <>
              <button
                style={headerBtn()}
                onClick={() => { setNewRow({ account_code: '', hours: '0', cost: '0' }); setError(null) }}
                disabled={!!newRow || !coId}
              >
                <Plus size={10} /> Add
              </button>
              <button style={headerBtn()} onClick={enterEdit} disabled={!coId}>
                <Pencil size={10} /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ padding: '3px 12px', fontSize: 11, color: 'var(--ink-negative)', background: '#FEF2F2', borderBottom: '1px solid #FECACA', flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)' }}>
              <th style={{ ...thSt, width: 36 }}>#</th>
              <th style={{ ...thSt, width: 120 }}>Account ID</th>
              <th style={thSt}>Description</th>
              <th style={{ ...thSt, textAlign: 'right', width: 110 }}>Hours</th>
              <th style={{ ...thSt, textAlign: 'right', width: 120 }}>Cost</th>
              {hasActionCol && <th style={{ width: 52 }} />}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && !newRow ? (
              <tr>
                <td
                  colSpan={hasActionCol ? 6 : 5}
                  style={{ ...tdSt, color: 'var(--ink-muted)', textAlign: 'center', padding: '16px 10px' }}
                >
                  No control accounts impacted
                </td>
              </tr>
            ) : lines.map((line, i) => {
              const e = edits[line.id]
              return (
                <tr key={line.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdSt, color: 'var(--ink-3)' }}>{i + 1}</td>
                  <td className="num" style={{ ...tdSt, fontWeight: 600, color: 'var(--accent)' }}>
                    {line.cost_account_code}
                  </td>
                  <td style={tdSt}>{line.cost_account_description}</td>
                  <td className="num" style={{ ...tdSt, textAlign: 'right', padding: isEditing ? '3px 6px' : '5px 10px' }}>
                    {isEditing && e
                      ? <input type="number" value={e.hours} style={inputSt}
                          onChange={ev => setEdits(p => ({ ...p, [line.id]: { ...p[line.id], hours: ev.target.value } }))} />
                      : fmt(line.hour_impact)}
                  </td>
                  <td className="num" style={{ ...tdSt, textAlign: 'right', fontWeight: 600, padding: isEditing ? '3px 6px' : '5px 10px' }}>
                    {isEditing && e
                      ? <input type="number" value={e.cost} style={inputSt}
                          onChange={ev => setEdits(p => ({ ...p, [line.id]: { ...p[line.id], cost: ev.target.value } }))} />
                      : fmt(line.cost_impact)}
                  </td>
                  {hasActionCol && (
                    <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                      {isEditing && (
                        <button
                          style={iconBtn('var(--ink-negative)')}
                          title="Remove"
                          onClick={() => handleDelete(line.id)}
                          disabled={deleteLine.isPending}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}

            {/* ── New row ── */}
            {newRow && (
              <tr style={{ borderBottom: '1px solid var(--border)', background: '#FAFAF5' }}>
                <td style={{ ...tdSt, color: 'var(--ink-3)' }}>{lines.length + 1}</td>
                <td style={{ ...tdSt, padding: '3px 6px' }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. CA-31-SC"
                    value={newRow.account_code}
                    style={{ ...inputSt, textAlign: 'left', width: '100%' }}
                    onChange={e => setNewRow(p => p ? { ...p, account_code: e.target.value } : null)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmAdd() }}
                  />
                </td>
                <td style={{ ...tdSt, color: 'var(--ink-muted)', fontSize: 10 }}>—</td>
                <td style={{ padding: '3px 6px' }}>
                  <input
                    type="number"
                    value={newRow.hours}
                    style={inputSt}
                    onChange={e => setNewRow(p => p ? { ...p, hours: e.target.value } : null)}
                  />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input
                    type="number"
                    value={newRow.cost}
                    style={inputSt}
                    onChange={e => setNewRow(p => p ? { ...p, cost: e.target.value } : null)}
                  />
                </td>
                <td style={{ padding: '3px 4px' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      style={iconBtn('var(--ink-positive)')}
                      title="Confirm"
                      disabled={!newRow.account_code.trim() || addLine.isPending}
                      onClick={confirmAdd}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      style={iconBtn()}
                      title="Discard"
                      onClick={() => { setNewRow(null); setError(null) }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

          {(lines.length > 0 || newRow) && (
            <tfoot>
              <tr style={{ background: 'var(--surface-alt)', borderTop: '1px solid var(--border-strong)' }}>
                <td
                  colSpan={colSpanLabel}
                  style={{ padding: '5px 10px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--ink-3)' }}
                >
                  Total ({lines.length} account{lines.length !== 1 ? 's' : ''})
                </td>
                <td className="num" style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600, fontSize: 11 }}>
                  {fmt(totalHours)}
                </td>
                <td className="num" style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600, fontSize: 11 }}>
                  {fmt(totalCost)}
                </td>
                {hasActionCol && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
