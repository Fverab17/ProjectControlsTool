import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileUp, X } from 'lucide-react'
import { API_BASE } from '../../lib/api'

interface Props {
  period: string
  projectId: string
  onClose: () => void
  onImported: () => void
}

interface PreviewRow { period_code?: string; account_code: string; actual_cost: string; valid: boolean }

interface ImportResult {
  period_code: string
  periods_affected: number
  imported: number
  skipped: number
  errors: Array<{ row: number; account_code: string; message: string }>
}

type Step = 'pick' | 'upload' | 'importing' | 'done'
type ImportTypeId = 'actuals' | 'actuals_history'

const IMPORT_TYPES: Array<{ id: ImportTypeId; label: string; description: string }> = [
  { id: 'actuals',         label: 'Actuals',          description: 'Current period actual costs from CSV' },
  { id: 'actuals_history', label: 'Actuals — History', description: 'Multi-period actuals with period column' },
]

const FORMAT_EXAMPLE: Record<ImportTypeId, string> = {
  actuals: `account_code,actual_cost\n1.1.1,125000.00\n1.1.2,87500.00\n2.1.1,340000.00`,
  actuals_history: `period_code,account_code,actual_cost\n2024-01,1.1.1,110000.00\n2024-02,1.1.1,115000.00\n2024-03,1.1.1,119000.00`,
}

const FORMAT_NOTE: Record<ImportTypeId, string> = {
  actuals:         'UTF-8 CSV · header row required · one row per account · period = currently selected period',
  actuals_history: 'UTF-8 CSV · header row required · period_code must match an existing period · does not close periods',
}

function parseCSVPreview(text: string, type: ImportTypeId): PreviewRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const perIdx  = headers.indexOf('period_code')
  const codeIdx = headers.indexOf('account_code')
  const costIdx = headers.indexOf('actual_cost')
  if (codeIdx === -1 || costIdx === -1) return []
  return lines.slice(1, 21).map(line => {
    const cols = line.split(',')
    const per  = perIdx !== -1 ? (cols[perIdx]?.trim() ?? '') : undefined
    const code = cols[codeIdx]?.trim() ?? ''
    const cost = cols[costIdx]?.trim() ?? ''
    const validPer = type === 'actuals' || (per !== undefined && per !== '')
    return { period_code: per, account_code: code, actual_cost: cost, valid: code !== '' && !isNaN(Number(cost)) && validPer }
  })
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const dialog: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  width: 680, maxHeight: '80vh',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
}

const labelSt: React.CSSProperties = {
  fontSize: 9.5, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

export function ImportModal({ period, projectId, onClose, onImported }: Props) {
  const [selectedType, setSelectedType] = useState<ImportTypeId>('actuals')
  const [step, setStep] = useState<Step>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      setPreview(parseCSVPreview(text, selectedType))
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
    if (!file) return
    setStep('importing')
    const form = new FormData()
    form.append('file', file)
    const url = selectedType === 'actuals_history'
      ? `${API_BASE}/projects/${projectId}/import/actuals/history`
      : `${API_BASE}/projects/${projectId}/periods/${encodeURIComponent(period)}/import/actuals`
    try {
      const res = await fetch(url, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
        setResult({ period_code: period, periods_affected: 0, imported: 0, skipped: 0, errors: [{ row: 0, account_code: '', message: err.detail ?? 'Upload failed' }] })
      } else {
        setResult(await res.json())
        onImported()
      }
    } catch {
      setResult({ period_code: period, periods_affected: 0, imported: 0, skipped: 0, errors: [{ row: 0, account_code: '', message: 'Network error' }] })
    }
    setStep('done')
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
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--panel-header-bg)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--panel-header-ink)' }}>
            {selectedType === 'actuals_history' ? 'Import — Historical Actuals' : `Import — Period ${period}`}
          </span>
          <button onClick={onClose} style={{ color: 'var(--ink-3)' }} className="hover:text-[var(--ink-1)]">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">

          {/* Left — type picker */}
          <div className="flex-shrink-0 py-3 px-2" style={{ width: 160, borderRight: '1px solid var(--border)', background: 'var(--app-bg)' }}>
            <div style={{ ...labelSt, paddingLeft: 8, marginBottom: 6 }}>Import Type</div>
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
                <div style={{ fontSize: 9.5, color: 'var(--ink-3)', fontWeight: 400, marginTop: 1 }}>{t.description}</div>
              </button>
            ))}
          </div>

          {/* Right — content */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">

            {/* Format instructions */}
            <div>
              <div style={labelSt}>Expected Format</div>
              <pre style={{
                marginTop: 6, padding: '8px 10px', fontSize: 10.5,
                fontFamily: '"IBM Plex Mono", monospace',
                background: 'var(--app-bg)', border: '1px solid var(--border)',
                borderRadius: 3, color: 'var(--ink-2)', lineHeight: 1.6,
              }}>
                {FORMAT_EXAMPLE[selectedType]}
              </pre>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 5 }}>
                {FORMAT_NOTE[selectedType]}
              </div>
            </div>

            {/* Drop zone — shown until file chosen */}
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
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>
            )}

            {/* Preview */}
            {(step === 'upload' || step === 'importing') && preview.length > 0 && (
              <div>
                <div style={{ ...labelSt, marginBottom: 6 }}>
                  Preview — {file?.name} ({preview.length} rows shown)
                </div>
                <div style={{ border: '1px solid var(--border-strong)', borderRadius: 3, overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-alt)' }}>
                        {[
                          ...(selectedType === 'actuals_history' ? ['Period'] : []),
                          'Account Code', 'Actual Cost', '',
                        ].map(h => (
                          <th key={h} style={{ padding: '4px 10px', textAlign: 'left', fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          {selectedType === 'actuals_history' && (
                            <td style={{ padding: '3px 10px', fontFamily: '"IBM Plex Mono", monospace', color: 'var(--ink-3)' }}>{row.period_code}</td>
                          )}
                          <td style={{ padding: '3px 10px', fontFamily: '"IBM Plex Mono", monospace', color: 'var(--ink-1)' }}>{row.account_code}</td>
                          <td style={{ padding: '3px 10px', fontFamily: '"IBM Plex Mono", monospace', textAlign: 'right', color: 'var(--ink-1)' }}>{row.actual_cost}</td>
                          <td style={{ padding: '3px 10px', width: 20 }}>
                            {!row.valid && <AlertCircle size={12} style={{ color: 'var(--ink-negative)' }} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Result */}
            {step === 'done' && result && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: result.imported > 0 ? 'var(--ink-positive, #2e7d32)' : 'var(--ink-3)' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>
                    Import complete
                  </span>
                </div>
                <div className="flex gap-6 mb-3">
                  {[
                    ...(result.periods_affected > 0 ? [['Periods', result.periods_affected, 'var(--ink-3)']] : []),
                    ['Imported', result.imported, 'var(--ink-1)'],
                    ['Skipped',  result.skipped,  'var(--ink-3)'],
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
                      <div key={i} className="flex gap-3 items-start px-3 py-1.5" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: 10.5 }}>
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
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border-strong)', background: 'var(--app-bg)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
            {step === 'upload' && file && `${file.name} · ${preview.length} rows`}
            {step === 'importing' && 'Importing…'}
          </div>
          <div className="flex gap-2">
            {step === 'done' ? (
              <>
                <button onClick={reset} className="px-3 py-1.5 rounded"
                  style={{ fontSize: 11, border: '1px solid var(--border-strong)', color: 'var(--ink-2)' }}>
                  Import Another
                </button>
                <button onClick={onClose} className="px-3 py-1.5 rounded"
                  style={{ fontSize: 11, fontWeight: 600, background: 'var(--accent)', color: '#fff' }}>
                  Close
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="px-3 py-1.5 rounded"
                  style={{ fontSize: 11, border: '1px solid var(--border-strong)', color: 'var(--ink-2)' }}>
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={step !== 'upload' || !file}
                  className="px-3 py-1.5 rounded"
                  style={{
                    fontSize: 11, fontWeight: 600,
                    background: 'var(--accent)', color: '#fff',
                    opacity: step !== 'upload' || !file ? 0.4 : 1,
                    cursor: step !== 'upload' || !file ? 'default' : 'pointer',
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
