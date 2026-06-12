import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileUp, X } from 'lucide-react'

interface Props {
  projectId: string
  onClose: () => void
  onImported: () => void
}

interface PreviewRow {
  account_code: string
  description: string
  wbs_code: string
  cbs_code: string
  package_code: string
  discipline: string
  cost_budget: string
  hours_budget: string
  status: 'ok' | 'error'
  messages: string[]
}

interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ row: number; account_code: string; message: string }>
}

type Step = 'pick' | 'upload' | 'importing' | 'done'
type ImportTypeId = 'new_accounts' | 'upsert'

const IMPORT_TYPES: Array<{ id: ImportTypeId; label: string; description: string }> = [
  { id: 'new_accounts', label: 'New Accounts',    description: 'Create accounts; skip if code already exists' },
  { id: 'upsert',       label: 'Create / Update', description: 'Create new or update existing accounts' },
]

const FORMAT_EXAMPLE: Record<ImportTypeId, string> = {
  new_accounts: [
    'account_code,description,wbs_code,cbs_code,package_code,discipline,cost_budget,hours_budget',
    '1.1.01,Project Controls Labor,1.1,1.1,P1.01,Project Controls,450000,4200',
    '1.1.02,Project Controls Software,1.1,1.2,P1.01,Project Controls,85000,0',
    '2.1.01,Process Engineering,2.1,2.1,P2.01,Process,920000,8400',
  ].join('\n'),
  upsert: [
    'account_code,description,wbs_code,cbs_code,package_code,discipline,cost_budget,hours_budget',
    '1.1.01,Project Controls — Rev 2,1.1,1.1,P1.01,Project Controls,465000,4400',
    '3.1.01,Bulk Materials — Pipe,3.1,3.1,P3.01,Procurement,1200000,0',
  ].join('\n'),
}

const FORMAT_NOTE =
  'UTF-8 CSV · header row required · account_code + description are required · ' +
  'wbs_code / cbs_code / package_code must match existing structure codes · ' +
  'cost_budget and hours_budget default to 0 if omitted'

function parsePreview(text: string): PreviewRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const idx = (name: string) => headers.indexOf(name)
  const get = (cols: string[], i: number) => i !== -1 ? (cols[i]?.trim() ?? '') : ''
  const codeI = idx('account_code')
  const descI = idx('description')
  if (codeI === -1 || descI === -1) return []
  return lines.slice(1, 21).map(line => {
    const c = line.split(',')
    const account_code = get(c, codeI)
    const description  = get(c, descI)
    const wbs_code     = get(c, idx('wbs_code'))
    const cbs_code     = get(c, idx('cbs_code'))
    const package_code = get(c, idx('package_code'))
    const discipline   = get(c, idx('discipline'))
    const cost_budget  = get(c, idx('cost_budget'))
    const hours_budget = get(c, idx('hours_budget'))
    const msgs: string[] = []
    if (!account_code) msgs.push('account_code required')
    if (!description)  msgs.push('description required')
    if (cost_budget  && isNaN(Number(cost_budget)))  msgs.push('invalid cost_budget')
    if (hours_budget && isNaN(Number(hours_budget))) msgs.push('invalid hours_budget')
    return {
      account_code, description, wbs_code, cbs_code, package_code,
      discipline, cost_budget, hours_budget,
      status: msgs.length ? 'error' : 'ok',
      messages: msgs,
    }
  })
}

// ─── styles (match ImportModal) ─────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const dialog: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  width: 820, maxHeight: '82vh',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
}
const labelSt: React.CSSProperties = {
  fontSize: 9.5, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}
const th: React.CSSProperties = {
  padding: '4px 8px', textAlign: 'left',
  fontSize: 9.5, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
}
const td: React.CSSProperties = { padding: '3px 8px', fontSize: 11 }

// ─── component ───────────────────────────────────────────────────────────────

export function ImportAccountsModal({ projectId: _projectId, onClose, onImported }: Props) {
  const [selectedType, setSelectedType] = useState<ImportTypeId>('new_accounts')
  const [step, setStep]     = useState<Step>('pick')
  const [file, setFile]     = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const errorCount = preview.filter(r => r.status === 'error').length

  function handleFile(f: File) {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      setPreview(parsePreview(text))
      setStep('upload')
    }
    reader.readAsText(f, 'utf-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleImport() {
    if (!file || errorCount > 0) return
    setStep('importing')
    // Stub: POST /api/projects/:id/cost-accounts/import when backend endpoint is built
    await new Promise(r => setTimeout(r, 900))
    const ok   = preview.filter(r => r.status === 'ok')
    const errs = preview.filter(r => r.status === 'error')
    const created = selectedType === 'upsert' ? Math.ceil(ok.length * 0.65) : ok.length
    const updated = selectedType === 'upsert' ? ok.length - created : 0
    setResult({
      created,
      updated,
      skipped: errs.length,
      errors: errs.map((r, i) => ({
        row: i + 2,
        account_code: r.account_code,
        message: r.messages.join('; '),
      })),
    })
    setStep('done')
    onImported()
  }

  function reset() {
    setStep('pick')
    setFile(null)
    setPreview([])
    setResult(null)
  }

  return (
    <div style={overlay} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div style={dialog}>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--panel-header-bg)' }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--panel-header-ink)' }}>
            Import Cost Accounts
          </span>
          <button onClick={onClose} style={{ color: 'var(--ink-3)' }} className="hover:text-[var(--ink-1)]">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">

          {/* Left — type picker */}
          <div
            className="flex-shrink-0 py-3 px-2"
            style={{ width: 170, borderRight: '1px solid var(--border)', background: 'var(--app-bg)' }}
          >
            <div style={{ ...labelSt, paddingLeft: 8, marginBottom: 6 }}>Import Mode</div>
            {IMPORT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedType(t.id); reset() }}
                className="w-full text-left px-3 py-2 rounded"
                style={{
                  fontSize: 11.5,
                  background: selectedType === t.id ? 'var(--surface-hover)' : 'transparent',
                  color: selectedType === t.id ? 'var(--accent)' : 'var(--ink-2)',
                  fontWeight: selectedType === t.id ? 600 : 400,
                }}
              >
                {t.label}
                <div style={{ fontSize: 9.5, color: 'var(--ink-3)', fontWeight: 400, marginTop: 1, lineHeight: 1.4 }}>
                  {t.description}
                </div>
              </button>
            ))}

            <div style={{ ...labelSt, paddingLeft: 8, marginTop: 18, marginBottom: 6 }}>Columns</div>
            {[
              ['account_code', 'Required'],
              ['description',  'Required'],
              ['wbs_code',     'Optional'],
              ['cbs_code',     'Optional'],
              ['package_code', 'Optional'],
              ['discipline',   'Optional'],
              ['cost_budget',  'Optional'],
              ['hours_budget', 'Optional'],
            ].map(([col, req]) => (
              <div key={col} className="flex justify-between items-baseline px-3 py-0.5">
                <span style={{ fontSize: 9.5, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--ink-2)' }}>{col}</span>
                <span style={{ fontSize: 8.5, color: req === 'Required' ? 'var(--accent)' : 'var(--ink-muted)' }}>{req}</span>
              </div>
            ))}
          </div>

          {/* Right — content */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">

            {/* Format guide */}
            <div>
              <div style={labelSt}>Expected Format</div>
              <pre style={{
                marginTop: 6, padding: '8px 10px', fontSize: 10,
                fontFamily: '"IBM Plex Mono", monospace',
                background: 'var(--app-bg)', border: '1px solid var(--border)',
                borderRadius: 3, color: 'var(--ink-2)', lineHeight: 1.6,
                overflowX: 'auto', whiteSpace: 'pre',
              }}>
                {FORMAT_EXAMPLE[selectedType]}
              </pre>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 5 }}>
                {FORMAT_NOTE}
              </div>
            </div>

            {/* Drop zone */}
            {step === 'pick' && (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-strong)'}`,
                  borderRadius: 4, padding: '28px 16px',
                  textAlign: 'center', cursor: 'pointer',
                  background: dragging ? 'var(--surface-hover)' : 'transparent',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <FileUp size={24} style={{ color: 'var(--accent)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-1)' }}>
                  Drop CSV here or click to browse
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 4 }}>
                  .csv files only
                </div>
                <input
                  ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </div>
            )}

            {/* Preview table */}
            {(step === 'upload' || step === 'importing') && preview.length > 0 && (
              <div>
                <div style={{ ...labelSt, marginBottom: 6 }}>
                  Preview — {file?.name} ({preview.length} rows shown
                  {errorCount > 0 && <span style={{ color: 'var(--ink-negative, #c62828)' }}>, {errorCount} error{errorCount > 1 ? 's' : ''}</span>}
                  )
                </div>
                <div style={{ border: '1px solid var(--border-strong)', borderRadius: 3, overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-alt)' }}>
                        <th style={{ ...th, width: 90 }}>Account</th>
                        <th style={{ ...th }}>Description</th>
                        <th style={{ ...th, width: 60 }}>WBS</th>
                        <th style={{ ...th, width: 60 }}>CBS</th>
                        <th style={{ ...th, width: 70 }}>Package</th>
                        <th style={{ ...th, width: 80, textAlign: 'right' }}>Budget ($)</th>
                        <th style={{ ...th, width: 70, textAlign: 'right' }}>Hours</th>
                        <th style={{ ...th, width: 24 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)', background: row.status === 'error' ? 'rgba(198,40,40,0.04)' : 'transparent' }}>
                          <td style={{ ...td, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--accent)', fontWeight: 600 }}>
                            {row.account_code || <span style={{ color: 'var(--ink-muted)' }}>—</span>}
                          </td>
                          <td style={{ ...td, color: 'var(--ink-1)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.description || <span style={{ color: 'var(--ink-muted)' }}>—</span>}
                          </td>
                          <td style={{ ...td, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--ink-3)', fontSize: 10.5 }}>
                            {row.wbs_code || '—'}
                          </td>
                          <td style={{ ...td, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--ink-3)', fontSize: 10.5 }}>
                            {row.cbs_code || '—'}
                          </td>
                          <td style={{ ...td, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--ink-3)', fontSize: 10.5 }}>
                            {row.package_code || '—'}
                          </td>
                          <td style={{ ...td, fontFamily: '"IBM Plex Mono", monospace', textAlign: 'right', color: 'var(--ink-2)' }}>
                            {row.cost_budget || '0'}
                          </td>
                          <td style={{ ...td, fontFamily: '"IBM Plex Mono", monospace', textAlign: 'right', color: 'var(--ink-2)' }}>
                            {row.hours_budget || '0'}
                          </td>
                          <td style={{ ...td, width: 24 }}>
                            {row.status === 'error' && (
                              <span title={row.messages.join('; ')} style={{ display: 'inline-flex' }}>
                                <AlertCircle size={12} style={{ color: 'var(--ink-negative, #c62828)' }} />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {errorCount > 0 && (
                  <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--ink-negative, #c62828)' }}>
                    Fix errors before importing: {preview.filter(r => r.status === 'error').flatMap(r => r.messages).join(' · ')}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {step === 'done' && result && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: result.created + result.updated > 0 ? 'var(--ink-positive, #2e7d32)' : 'var(--ink-3)' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>
                    Import complete
                  </span>
                </div>
                <div className="flex gap-6 mb-3">
                  {[
                    ['Created', result.created, 'var(--ink-1)'],
                    ...(result.updated > 0 ? [['Updated', result.updated, 'var(--ink-2)']] : []),
                    ['Skipped', result.skipped, 'var(--ink-3)'],
                  ].map(([label, val, color]) => (
                    <div key={label as string}>
                      <div style={labelSt}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', color: color as string }}>{val}</div>
                    </div>
                  ))}
                </div>
                {result.errors.length > 0 && (
                  <div style={{ border: '1px solid var(--border-strong)', borderRadius: 3, maxHeight: 140, overflowY: 'auto' }}>
                    {result.errors.map((e, i) => (
                      <div
                        key={i}
                        className="flex gap-3 items-start px-3 py-1.5"
                        style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: 10.5 }}
                      >
                        <span style={{ color: 'var(--ink-3)', flexShrink: 0 }}>Row {e.row}</span>
                        <span style={{ fontFamily: '"IBM Plex Mono", monospace', color: 'var(--accent)', flexShrink: 0 }}>{e.account_code}</span>
                        <span style={{ color: 'var(--ink-negative, #c62828)' }}>{e.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border-strong)', background: 'var(--app-bg)' }}
        >
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
            {step === 'upload' && file && (
              <>{file.name} · {preview.length} rows{errorCount > 0 && <span style={{ color: 'var(--ink-negative, #c62828)' }}> · {errorCount} error{errorCount > 1 ? 's' : ''}</span>}</>
            )}
            {step === 'importing' && 'Importing…'}
          </div>
          <div className="flex gap-2">
            {step === 'done' ? (
              <>
                <button
                  onClick={reset}
                  className="px-3 py-1.5 rounded"
                  style={{ fontSize: 11, border: '1px solid var(--border-strong)', color: 'var(--ink-2)' }}
                >
                  Import Another
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded"
                  style={{ fontSize: 11, fontWeight: 600, background: 'var(--accent)', color: '#fff' }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded"
                  style={{ fontSize: 11, border: '1px solid var(--border-strong)', color: 'var(--ink-2)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={step !== 'upload' || !file || errorCount > 0}
                  className="px-3 py-1.5 rounded"
                  style={{
                    fontSize: 11, fontWeight: 600,
                    background: 'var(--accent)', color: '#fff',
                    opacity: step !== 'upload' || !file || errorCount > 0 ? 0.4 : 1,
                    cursor: step !== 'upload' || !file || errorCount > 0 ? 'default' : 'pointer',
                  }}
                >
                  {step === 'importing' ? 'Importing…' : 'Import'}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
