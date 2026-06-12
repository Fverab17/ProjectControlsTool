import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { API_BASE } from '../../lib/api'

interface Props {
  period: string
  projectId: string
  onClose: () => void
}

type ExportTypeId = 'cost_report'

interface ExportType {
  id: ExportTypeId
  label: string
  description: string
  filename: (period: string) => string
  url: (projectId: string, period: string) => string
  columns: string[]
}

const EXPORT_TYPES: ExportType[] = [
  {
    id: 'cost_report',
    label: 'Cost Report',
    description: 'One row per control account. Full EVM columns including budget baselines, change growth, commitments, earned, ETC, EAC, and variance against approved budget and previous period.',
    filename: (period) => `cost-report-${period}.xlsx`,
    url: (projectId, period) =>
      `${API_BASE}/projects/${projectId}/export/cost-report?period=${encodeURIComponent(period)}`,
    columns: [
      'WBS', 'CBS', 'Account Code', 'Description',
      'Original Budget', 'Approved Budget', 'Pending Budget',
      'Growth – Approved', 'Growth – Pending', 'Trends',
      'Commitments', 'Actual Cost (AC)', 'Earned Cost (EV)',
      'ETC Cost', 'EAC Cost',
      'Variance (Approved – EAC)', 'EAC vs Prev Period',
    ],
  },
]

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const dialog: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  width: 620, maxHeight: '80vh',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
}

const labelSt: React.CSSProperties = {
  fontSize: 9.5, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

export function ExportModal({ period, projectId, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<ExportTypeId>('cost_report')
  const [downloading, setDownloading] = useState(false)

  const selected = EXPORT_TYPES.find(t => t.id === selectedId)!

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(selected.url(projectId, period))
      if (!res.ok) return
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = selected.filename(period)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
      onClose()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={overlay} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div style={dialog}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--panel-header-bg)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--panel-header-ink)' }}>
            Export — Period {period}
          </span>
          <button onClick={onClose} style={{ color: 'var(--ink-3)' }} className="hover:text-[var(--ink-1)]">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">

          {/* Left — type picker */}
          <div className="flex-shrink-0 py-3 px-2" style={{ width: 160, borderRight: '1px solid var(--border)', background: 'var(--app-bg)' }}>
            <div style={{ ...labelSt, paddingLeft: 8, marginBottom: 6 }}>Report Type</div>
            {EXPORT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="w-full text-left px-3 py-2 rounded"
                style={{
                  fontSize: 11.5,
                  background: selectedId === t.id ? 'var(--surface-hover)' : 'transparent',
                  color: selectedId === t.id ? 'var(--accent)' : 'var(--ink-2)',
                  fontWeight: selectedId === t.id ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Right — detail */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 6 }}>
                {selected.label}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                {selected.description}
              </div>
            </div>

            <div>
              <div style={{ ...labelSt, marginBottom: 8 }}>Columns included</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.columns.map(col => (
                  <span
                    key={col}
                    style={{
                      fontSize: 10.5, padding: '2px 8px', borderRadius: 2,
                      background: 'var(--surface-alt)',
                      border: '1px solid var(--border)',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
              Output: Excel (.xlsx) · one sheet · no formatting · header row included
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border-strong)', background: 'var(--app-bg)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
            {selected.filename(period)}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded"
              style={{ fontSize: 11, border: '1px solid var(--border-strong)', color: 'var(--ink-2)' }}>
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded"
              style={{
                fontSize: 11, fontWeight: 600,
                background: 'var(--accent)', color: '#fff',
                opacity: downloading ? 0.6 : 1,
                cursor: downloading ? 'wait' : 'pointer',
              }}
            >
              <Download size={13} />
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
