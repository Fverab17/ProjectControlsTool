import { useRef, useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, X, Info } from 'lucide-react'

interface PreviewRow {
  account_code: string
  description: string
  cost_budget: string
  hours_budget: string
  status: 'ok' | 'warn' | 'error'
  message?: string
}

const EXAMPLE_CSV = `account_code,description,cost_budget,hours_budget
1.1.01,Project Controls - Labor,450000,4200
1.1.02,Project Controls - Software,85000,0
1.2.01,HSSE Management - Labor,620000,5800
2.1.01,Process Engineering,720000,6500`

function parsePreview(csv: string): PreviewRow[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const codeIdx = header.indexOf('account_code')
  const descIdx = header.indexOf('description')
  const costIdx = header.indexOf('cost_budget')
  const hoursIdx = header.indexOf('hours_budget')

  if (codeIdx < 0 || costIdx < 0) return []

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    const code = cols[codeIdx] ?? ''
    const desc = descIdx >= 0 ? (cols[descIdx] ?? '') : ''
    const cost = cols[costIdx] ?? ''
    const hours = hoursIdx >= 0 ? (cols[hoursIdx] ?? '') : ''
    const costNum = parseFloat(cost)
    let status: PreviewRow['status'] = 'ok'
    let message: string | undefined
    if (!code) { status = 'error'; message = 'Missing account code' }
    else if (isNaN(costNum)) { status = 'error'; message = 'Invalid cost value' }
    else if (costNum < 0) { status = 'warn'; message = 'Negative budget' }
    return { account_code: code, description: desc, cost_budget: cost, hours_budget: hours, status, message }
  })
}

function fmtNum(v: string): string {
  const n = parseFloat(v)
  if (isNaN(n)) return v
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export function BudgetImportTab({ projectId: _projectId }: { projectId: string }) {
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file: File) => {
    setImported(false)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      setPreview(parsePreview(text))
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const errorCount = preview?.filter(r => r.status === 'error').length ?? 0
  const warnCount  = preview?.filter(r => r.status === 'warn').length ?? 0
  const okCount    = preview?.filter(r => r.status === 'ok').length ?? 0

  const handleImport = () => {
    if (!preview || errorCount > 0) return
    setImporting(true)
    setTimeout(() => { setImporting(false); setImported(true) }, 900)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Section header */}
      <div
        className="px-4 py-2 flex-shrink-0 flex items-center justify-between"
        style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Original Budget Import
        </span>
        <span className="text-[10.5px]" style={{ color: 'var(--ink-muted)' }}>
          Sets cost_bac_baseline · cost_bac_approved · cost_bac_control
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* Info banner */}
        <div
          className="flex items-start gap-3 px-4 py-3 mb-5 text-[11.5px]"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 3, color: 'var(--accent)' }}
        >
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ color: 'var(--ink-2)' }}>
            This import establishes the <strong>original baseline budget</strong> for all cost accounts.
            It sets all three budget versions (Baseline, Approved, Control) to the same value —
            the starting point before any approved changes. Run this once at project kick-off
            before cost control begins.
          </div>
        </div>

        {/* CSV format guide */}
        <div className="mb-5">
          <div className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Expected CSV Format
          </div>
          <div
            className="px-4 py-3 text-[11px]"
            style={{ background: '#F0F0E8', border: '1px solid var(--border-strong)', borderRadius: 3, fontFamily: '"IBM Plex Mono", monospace' }}
          >
            <div style={{ color: 'var(--ink-3)', marginBottom: 4 }}>
              <span style={{ color: 'var(--ink-negative)', fontWeight: 600 }}>account_code</span>
              ,description,
              <span style={{ color: 'var(--ink-negative)', fontWeight: 600 }}>cost_budget</span>
              ,hours_budget
            </div>
            {EXAMPLE_CSV.split('\n').slice(1).map((line, i) => (
              <div key={i} style={{ color: 'var(--ink-2)', fontSize: 10.5 }}>{line}</div>
            ))}
          </div>
          <div className="text-[10.5px] mt-1.5" style={{ color: 'var(--ink-muted)' }}>
            <span style={{ color: 'var(--ink-negative)' }}>Bold columns</span> are required.
            {' '}account_code must match an existing cost account code in this project.
            {' '}hours_budget is optional — omit column or leave blank to keep at 0.
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 cursor-pointer mb-4"
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
            borderRadius: 4,
            background: dragOver ? 'var(--accent-soft)' : 'var(--surface-alt)',
            padding: '28px 20px',
            transition: 'all 120ms',
          }}
        >
          <Upload size={20} style={{ color: dragOver ? 'var(--accent)' : 'var(--ink-muted)' }} />
          <div className="text-[12px] font-medium" style={{ color: dragOver ? 'var(--accent)' : 'var(--ink-2)' }}>
            {fileName ? fileName : 'Drop CSV file here or click to browse'}
          </div>
          {!fileName && (
            <div className="text-[10.5px]" style={{ color: 'var(--ink-muted)' }}>UTF-8 · max 5MB</div>
          )}
          {fileName && (
            <button
              onClick={e => { e.stopPropagation(); setFileName(null); setPreview(null); setImported(false) }}
              className="flex items-center gap-1 text-[10.5px]"
              style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={10} /> Clear file
            </button>
          )}
          <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>

        {/* Preview */}
        {preview && preview.length > 0 && (
          <div className="mb-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 mb-2">
              <div className="text-[11px] font-semibold" style={{ color: 'var(--ink-2)' }}>
                Preview — {preview.length} rows
              </div>
              {okCount > 0    && <span className="text-[10.5px]" style={{ color: 'var(--ink-positive)' }}><CheckCircle size={10} style={{ display: 'inline', marginRight: 3 }} />{okCount} valid</span>}
              {warnCount > 0  && <span className="text-[10.5px]" style={{ color: 'var(--ink-warning)' }}><AlertCircle size={10} style={{ display: 'inline', marginRight: 3 }} />{warnCount} warnings</span>}
              {errorCount > 0 && <span className="text-[10.5px]" style={{ color: 'var(--ink-negative)' }}><AlertCircle size={10} style={{ display: 'inline', marginRight: 3 }} />{errorCount} errors</span>}
            </div>

            {/* Table */}
            <div style={{ border: '1px solid var(--border-strong)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: '20px 110px 1fr 110px 90px',
                  background: 'var(--surface-alt)',
                  borderBottom: '1px solid var(--border-strong)',
                  fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)',
                }}
              >
                <div style={{ padding: '4px 6px' }} />
                <div style={{ padding: '4px 10px', borderLeft: '1px solid var(--border)' }}>Account Code</div>
                <div style={{ padding: '4px 10px', borderLeft: '1px solid var(--border)' }}>Description</div>
                <div style={{ padding: '4px 10px', textAlign: 'right', borderLeft: '1px solid var(--border)' }}>Cost Budget</div>
                <div style={{ padding: '4px 10px', textAlign: 'right', borderLeft: '1px solid var(--border)' }}>Hours</div>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {preview.map((row, i) => (
                  <div
                    key={i}
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: '20px 110px 1fr 110px 90px',
                      borderBottom: '1px solid var(--border)',
                      background: row.status === 'error' ? 'rgba(164,50,43,0.06)' : row.status === 'warn' ? 'rgba(154,91,18,0.05)' : 'transparent',
                    }}
                  >
                    <div style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {row.status === 'ok'    && <CheckCircle size={10} style={{ color: 'var(--ink-positive)' }} />}
                      {row.status === 'warn'  && <AlertCircle size={10} style={{ color: 'var(--ink-warning)' }} />}
                      {row.status === 'error' && <AlertCircle size={10} style={{ color: 'var(--ink-negative)' }} />}
                    </div>
                    <div className="num truncate" style={{ padding: '4px 10px', fontSize: 11, color: 'var(--ink-2)', fontWeight: 500, borderLeft: '1px solid var(--border)' }}>
                      {row.account_code || <span style={{ color: 'var(--ink-negative)', fontStyle: 'italic' }}>missing</span>}
                    </div>
                    <div className="truncate" style={{ padding: '4px 10px', fontSize: 11, color: 'var(--ink-1)', borderLeft: '1px solid var(--border)' }}>
                      {row.description || <span style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>—</span>}
                      {row.message && <span style={{ fontSize: 10, color: row.status === 'error' ? 'var(--ink-negative)' : 'var(--ink-warning)', marginLeft: 6 }}>· {row.message}</span>}
                    </div>
                    <div className="num" style={{ padding: '4px 10px', fontSize: 11, textAlign: 'right', color: 'var(--ink-2)', borderLeft: '1px solid var(--border)' }}>
                      {fmtNum(row.cost_budget)}
                    </div>
                    <div className="num" style={{ padding: '4px 10px', fontSize: 11, textAlign: 'right', color: 'var(--ink-3)', borderLeft: '1px solid var(--border)' }}>
                      {row.hours_budget ? `${row.hours_budget}h` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Import button */}
        {preview && !imported && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={importing || errorCount > 0}
              style={{
                background: errorCount > 0 ? 'var(--surface)' : 'var(--accent)',
                color: errorCount > 0 ? 'var(--ink-muted)' : '#fff',
                border: `1px solid ${errorCount > 0 ? 'var(--border)' : 'var(--accent)'}`,
                borderRadius: 2, padding: '5px 16px',
                fontSize: 12, fontWeight: 600, cursor: errorCount > 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <FileText size={12} />
              {importing ? 'Importing…' : `Import ${preview.length} Rows`}
            </button>
            {errorCount > 0 && (
              <span className="text-[11px]" style={{ color: 'var(--ink-negative)' }}>
                Resolve {errorCount} error{errorCount !== 1 ? 's' : ''} before importing
              </span>
            )}
          </div>
        )}

        {imported && (
          <div
            className="flex items-center gap-2 px-4 py-3 text-[12px]"
            style={{ background: 'rgba(21,99,63,0.08)', border: '1px solid var(--ink-positive)', borderRadius: 3, color: 'var(--ink-positive)' }}
          >
            <CheckCircle size={14} />
            <strong>{okCount + warnCount} rows imported</strong> — original budget baseline set.
            Open Cost Control to verify account budgets.
          </div>
        )}

      </div>
    </div>
  )
}
