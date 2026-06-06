import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useCreateChangeOrder, useUpdateChangeOrder } from '../../hooks/useChangeOrders'
import type { ChangeOrderDetail, ChangeOrderIn, ChangeOrderUpdate } from '../../types/changes'

interface Props {
  projectId: string
  initial: ChangeOrderDetail | null  // null = create mode
  onClose: () => void
  onSaved: (id: string) => void
}

interface FormState {
  change_code: string
  description: string
  category: string
  status: string
  reason: string
  request_date: string
  issued_date: string
  approved_date: string
  scope_notes: string
}

const CATEGORIES = [
  { value: 'budget_transfer', label: 'Budget Transfer' },
  { value: 'scope',           label: 'Scope' },
  { value: 'growth',          label: 'Growth' },
  { value: 'trend',           label: 'Trend' },
]

const STATUSES = [
  { value: 'pending',   label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved',  label: 'Approved' },
  { value: 'cancelled', label: 'Cancelled' },
]

const REASONS = [
  { value: '',               label: '— None —' },
  { value: 'scope',          label: 'Scope Change' },
  { value: 'design',         label: 'Design Development' },
  { value: 'site_conditions',label: 'Site Conditions' },
  { value: 'schedule',       label: 'Schedule' },
  { value: 'rate',           label: 'Rate Escalation' },
  { value: 'other',          label: 'Other' },
]

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function toIso(date: string): string | null {
  if (!date) return null
  return `${date}T00:00:00`
}

const labelSt: React.CSSProperties = {
  fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: 2, display: 'block',
}
const inputSt: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border-strong)',
  borderRadius: 2, padding: '4px 8px', fontSize: 12, color: 'var(--ink-1)',
  outline: 'none', boxSizing: 'border-box',
}
const selectSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' }

export function ChangeFormModal({ projectId, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial

  const [form, setForm] = useState<FormState>({
    change_code:   initial?.change_code ?? '',
    description:   initial?.description ?? '',
    category:      initial?.category ?? '',
    status:        initial?.status ?? 'pending',
    reason:        initial?.reason ?? '',
    request_date:  toDateInput(initial?.request_date),
    issued_date:   toDateInput(initial?.issued_date),
    approved_date: toDateInput(initial?.approved_date),
    scope_notes:   initial?.scope_notes ?? '',
  })

  const [error, setError] = useState<string | null>(null)

  const createMut = useCreateChangeOrder(projectId)
  const updateMut = useUpdateChangeOrder(projectId, initial?.id ?? '')

  const isSaving = createMut.isPending || updateMut.isPending

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    setError(null)
    if (!form.change_code.trim() && !isEdit) {
      setError('Change ID is required.')
      return
    }
    try {
      if (!isEdit) {
        const body: ChangeOrderIn = {
          change_code:   form.change_code.trim(),
          description:   form.description || undefined,
          category:      form.category || undefined,
          status:        form.status,
          reason:        form.reason || undefined,
          request_date:  toIso(form.request_date),
          issued_date:   toIso(form.issued_date),
          approved_date: toIso(form.approved_date),
          scope_notes:   form.scope_notes || undefined,
        }
        const created = await createMut.mutateAsync(body)
        onSaved(created.id)
      } else {
        const body: ChangeOrderUpdate = {
          description:   form.description || null,
          category:      form.category || null,
          status:        form.status,
          reason:        form.reason || null,
          request_date:  toIso(form.request_date),
          issued_date:   toIso(form.issued_date),
          approved_date: toIso(form.approved_date),
          scope_notes:   form.scope_notes || null,
        }
        await updateMut.mutateAsync(body)
        onSaved(initial!.id)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          background: 'var(--app-bg)', borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          border: '1px solid var(--border-strong)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
          style={{ background: 'var(--panel-header-bg)', borderBottom: '1px solid var(--border-strong)', borderRadius: '3px 3px 0 0' }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--panel-header-ink)', letterSpacing: '0.04em' }}>
            {isEdit ? `Edit Change Order — ${initial!.change_code}` : 'New Change Order'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Row 1: Change Code / Category / Status */}
          <div className="flex gap-3">
            <div style={{ width: 130 }}>
              <label style={labelSt}>Change ID *</label>
              <input
                style={{ ...inputSt, color: isEdit ? 'var(--ink-muted)' : 'var(--ink-1)' }}
                value={form.change_code}
                onChange={set('change_code')}
                disabled={isEdit}
                placeholder="CO-001"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelSt}>Category</label>
              <select style={selectSt} value={form.category} onChange={set('category')}>
                <option value="">— Select —</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ width: 130 }}>
              <label style={labelSt}>Status</label>
              <select style={selectSt} value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelSt}>Description</label>
            <input style={inputSt} value={form.description} onChange={set('description')} placeholder="Short title for this change" />
          </div>

          {/* Row 2: Reason / Request Date / Issued Date / Approved Date */}
          <div className="flex gap-3">
            <div style={{ flex: 1 }}>
              <label style={labelSt}>Reason</label>
              <select style={selectSt} value={form.reason} onChange={set('reason')}>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ width: 130 }}>
              <label style={labelSt}>Request Date</label>
              <input type="date" style={inputSt} value={form.request_date} onChange={set('request_date')} />
            </div>
          </div>

          <div className="flex gap-3">
            <div style={{ flex: 1 }}>
              <label style={labelSt}>Issued Date</label>
              <input type="date" style={inputSt} value={form.issued_date} onChange={set('issued_date')} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelSt}>Approved Date</label>
              <input type="date" style={inputSt} value={form.approved_date} onChange={set('approved_date')} />
            </div>
          </div>

          {/* Scope Notes */}
          <div>
            <label style={labelSt}>Scope / Change Description</label>
            <textarea
              style={{ ...inputSt, resize: 'vertical', minHeight: 110, lineHeight: 1.5 }}
              value={form.scope_notes}
              onChange={set('scope_notes')}
              placeholder="Detailed description of the change scope, justification, and impacts…"
            />
          </div>

          {error && (
            <div style={{ fontSize: 11, color: 'var(--ink-negative)', padding: '4px 0' }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-2.5 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-alt)' }}
        >
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '5px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 2,
              background: 'var(--surface)', border: '1px solid var(--border-strong)',
              color: 'var(--ink-2)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '5px 18px', fontSize: 12, cursor: isSaving ? 'default' : 'pointer',
              borderRadius: 2, fontWeight: 600,
              background: isSaving ? 'var(--ink-muted)' : 'var(--accent)',
              border: 'none', color: '#fff',
            }}
          >
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
