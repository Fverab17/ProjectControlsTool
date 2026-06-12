import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpDown, Calculator, CheckCircle, ClipboardList, Download,
  FileBarChart, Filter, FolderInput, Lock, LockOpen, Plus, Settings2, TrendingUp, Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { API_BASE } from '../../lib/api'

interface Props {
  period: string
  projectId: string
  periodIsClosed: boolean
  onPeriodClosed: () => void
  onImport: () => void
  onImportAccounts: () => void
  onExport: () => void
}

interface RibbonBtn { icon: LucideIcon; label: string; onClick?: () => void; disabled?: boolean }
interface RibbonGroup { label: string; items: RibbonBtn[] }

const btnSt = (disabled?: boolean): React.CSSProperties => ({
  minWidth: 50,
  opacity: disabled ? 0.38 : 1,
  cursor: disabled ? 'default' : 'pointer',
})

export function CostControlRibbon({ period, projectId, periodIsClosed, onPeriodClosed, onImport, onImportAccounts, onExport }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [closing, setClosing] = useState(false)
  const [justClosed, setJustClosed] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Reset local closed state when the user switches periods
  useEffect(() => { setJustClosed(false) }, [period])

  // Dismiss popover on outside click
  useEffect(() => {
    if (!showConfirm) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node))
        setShowConfirm(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showConfirm])

  const isClosed = periodIsClosed || justClosed

  async function handleConfirmClose() {
    setClosing(true)
    try {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/periods/${encodeURIComponent(period)}/close`,
        { method: 'POST' },
      )
      if (res.ok) {
        setJustClosed(true)
        setShowConfirm(false)
        onPeriodClosed()
      }
    } finally {
      setClosing(false)
    }
  }

  const GROUPS: RibbonGroup[] = [
    {
      label: 'Data Entry',
      items: [
        { icon: Plus,         label: 'Add' },
        { icon: Trash2,       label: 'Delete' },
        { icon: Settings2,    label: 'Settings' },
        { icon: FolderInput,    label: 'Import',           onClick: onImport },
        { icon: ClipboardList,  label: 'Import\nAccounts', onClick: onImportAccounts },
      ],
    },
    {
      label: 'Calculations',
      items: [
        { icon: Calculator,  label: 'Calculate\nTotals' },
        { icon: ArrowUpDown, label: 'Spread\nBudgets' },
        { icon: TrendingUp,  label: 'Spread\nETC/Earned' },
      ],
    },
    {
      label: 'Reports',
      items: [
        { icon: FileBarChart, label: 'Reports' },
        { icon: Download,     label: 'Export', onClick: onExport },
        { icon: Filter,       label: 'Filter' },
      ],
    },
  ]

  return (
    <div
      className="flex items-stretch flex-shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border-strong)', minHeight: 62 }}
    >
      {GROUPS.map((group, gi) => (
        <div key={group.label} className="flex">
          <div className="flex flex-col">
            <div className="flex items-start gap-0.5 px-3 pt-2 pb-1 flex-1">
              {group.items.map(({ icon: Icon, label, onClick, disabled }) => (
                <button
                  key={label}
                  onClick={onClick}
                  disabled={disabled}
                  className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded transition-colors hover:bg-[var(--surface-hover)]"
                  style={btnSt(disabled)}
                >
                  <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                  <span className="text-[9.5px] text-center leading-tight" style={{ color: 'var(--ink-2)', whiteSpace: 'pre-line' }}>
                    {label}
                  </span>
                </button>
              ))}

              {/* Close Period — only in Calculations group */}
              {group.label === 'Calculations' && (
                <div className="relative" ref={popoverRef}>
                  <button
                    onClick={() => !isClosed && setShowConfirm(v => !v)}
                    disabled={isClosed}
                    className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded transition-colors hover:bg-[var(--surface-hover)]"
                    style={btnSt(isClosed)}
                  >
                    {isClosed
                      ? <Lock size={18} strokeWidth={1.5} style={{ color: 'var(--ink-muted)' }} />
                      : <LockOpen size={18} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                    }
                    <span className="text-[9.5px] text-center leading-tight" style={{ color: isClosed ? 'var(--ink-muted)' : 'var(--ink-2)', whiteSpace: 'pre-line' }}>
                      {isClosed ? 'Period\nClosed' : 'Close\nPeriod'}
                    </span>
                  </button>

                  {showConfirm && (
                    <div
                      className="absolute z-50 shadow-lg"
                      style={{
                        top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 4, padding: '10px 12px', width: 230,
                      }}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>
                        Close period {period}?
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginBottom: 10, lineHeight: 1.4 }}>
                        Snapshots ETC, EAC, and % complete for all accounts. Can be re-run to update.
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleConfirmClose}
                          disabled={closing}
                          className="flex items-center gap-1.5 px-3 py-1 rounded"
                          style={{
                            fontSize: 11, fontWeight: 600,
                            background: 'var(--accent)', color: '#fff',
                            opacity: closing ? 0.6 : 1, cursor: closing ? 'wait' : 'pointer',
                          }}
                        >
                          <CheckCircle size={12} />
                          {closing ? 'Closing…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setShowConfirm(false)}
                          disabled={closing}
                          className="px-3 py-1 rounded"
                          style={{
                            fontSize: 11, color: 'var(--ink-2)',
                            border: '1px solid var(--border-strong)',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-[8.5px] tracking-[0.14em] uppercase text-center pb-1.5" style={{ color: 'var(--ink-muted)' }}>
              {group.label}
            </div>
          </div>
          {gi < GROUPS.length - 1 && (
            <div className="w-px my-2 mx-1 flex-shrink-0" style={{ background: 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}
