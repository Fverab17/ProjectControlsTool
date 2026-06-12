import { useState } from 'react'
import { Plus, Lock, Unlock, CalendarCheck, X } from 'lucide-react'
import type { SetupPeriod } from '../../types/setup'

// ---------------------------------------------------------------------------
// Mock periods — 36 months Jan 2022 – Dec 2024
// Jan 2022 – Mar 2024 closed (27 periods), Apr 2024 – Dec 2024 open (9 periods)
// ---------------------------------------------------------------------------

function makePeriods(): SetupPeriod[] {
  const periods: SetupPeriod[] = []
  let seq = 0
  for (let year = 2022; year <= 2024; year++) {
    for (let month = 1; month <= 12; month++) {
      const mm = String(month).padStart(2, '0')
      const code = `${year}-${mm}`
      const endDay = new Date(year, month, 0).getDate()
      const isClosed = year < 2024 || (year === 2024 && month <= 3)
      periods.push({
        id: `p-${seq++}`,
        code,
        period_start: `${year}-${mm}-01`,
        period_end:   `${year}-${mm}-${String(endDay).padStart(2, '0')}`,
        is_closed: isClosed,
        fiscal_year_end: month === 12,
      })
    }
  }
  return periods
}

const MOCK_PERIODS = makePeriods()

// ---------------------------------------------------------------------------
// Add Period modal (stub)
// ---------------------------------------------------------------------------

function AddPeriodModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [fyEnd, setFyEnd] = useState(false)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border-strong)',
          borderRadius: 3, width: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}
        >
          <span className="text-[12px] font-semibold">Add Reporting Period</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--panel-header-ink)', opacity: 0.6 }}>
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 grid gap-3" style={{ gridTemplateColumns: '120px 1fr' }}>
          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Period Code</label>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="e.g. 2025-01"
            className="num text-[11px] px-2 py-1.5 outline-none"
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--ink-1)' }}
          />

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Start Date</label>
          <input
            type="date"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="num text-[11px] px-2 py-1.5 outline-none"
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--ink-1)' }}
          />

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>End Date</label>
          <input
            type="date"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="num text-[11px] px-2 py-1.5 outline-none"
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--ink-1)' }}
          />

          <label className="text-[11px] font-medium flex items-center" style={{ color: 'var(--ink-3)' }}>Fiscal Year End</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fyEnd} onChange={e => setFyEnd(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            <span className="text-[11px]" style={{ color: 'var(--ink-2)' }}>Mark as fiscal year-end period</span>
          </label>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2,
              color: 'var(--ink-2)', fontSize: 11, padding: '4px 12px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            disabled={!code || !start || !end}
            style={{
              background: code && start && end ? 'var(--accent)' : 'var(--surface)',
              color: code && start && end ? '#fff' : 'var(--ink-muted)',
              border: `1px solid ${code && start && end ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 2, fontSize: 11, padding: '4px 14px',
              cursor: code && start && end ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
            onClick={onClose}
          >
            Add Period
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function PeriodsTab({ projectId: _projectId }: { projectId: string }) {
  const [showAdd, setShowAdd] = useState(false)
  const periods = MOCK_PERIODS

  const closedCount = periods.filter(p => p.is_closed).length
  const openCount   = periods.length - closedCount

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-[11px]"
          style={{
            background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)',
            borderRadius: 2, padding: '3px 10px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={11} />Add Period
        </button>
        <div className="flex-1" />
        <span className="num text-[10.5px]" style={{ color: 'var(--ink-3)' }}>
          {periods.length} periods
        </span>
        <span className="text-[10.5px]" style={{ color: 'var(--ink-muted)' }}>·</span>
        <span className="flex items-center gap-1 text-[10.5px]" style={{ color: 'var(--ink-negative)' }}>
          <Lock size={10} />{closedCount} closed
        </span>
        <span className="text-[10.5px]" style={{ color: 'var(--ink-muted)' }}>·</span>
        <span className="flex items-center gap-1 text-[10.5px]" style={{ color: 'var(--ink-positive)' }}>
          <Unlock size={10} />{openCount} open
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid flex-shrink-0"
        style={{
          gridTemplateColumns: '100px 120px 120px 90px 90px 1fr',
          background: 'var(--surface-alt)',
          borderBottom: '1px solid var(--border-strong)',
          fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}
      >
        <div style={{ padding: '5px 12px', borderRight: '1px solid var(--border)' }}>Period</div>
        <div style={{ padding: '5px 12px', borderRight: '1px solid var(--border)' }}>Start Date</div>
        <div style={{ padding: '5px 12px', borderRight: '1px solid var(--border)' }}>End Date</div>
        <div style={{ padding: '5px 12px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>FY End</div>
        <div style={{ padding: '5px 12px', borderRight: '1px solid var(--border)' }}>Status</div>
        <div style={{ padding: '5px 12px' }}>Actions</div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {periods.map((period, i) => {
          return (
            <div
              key={period.id}
              className="grid items-center"
              style={{
                gridTemplateColumns: '100px 120px 120px 90px 90px 1fr',
                borderBottom: '1px solid var(--border)',
                background: period.is_closed
                  ? 'transparent'
                  : i % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)',
                minHeight: 28,
              }}
            >
              {/* Period code */}
              <div
                className="num font-medium flex items-center gap-1.5"
                style={{
                  padding: '4px 12px', fontSize: 11.5,
                  color: period.is_closed ? 'var(--ink-3)' : 'var(--ink-1)',
                  borderRight: '1px solid var(--border)',
                }}
              >
                {period.fiscal_year_end && (
                  <CalendarCheck size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                )}
                {period.code}
              </div>

              {/* Start */}
              <div className="num" style={{ padding: '4px 12px', fontSize: 11, color: 'var(--ink-3)', borderRight: '1px solid var(--border)' }}>
                {period.period_start}
              </div>

              {/* End */}
              <div className="num" style={{ padding: '4px 12px', fontSize: 11, color: 'var(--ink-3)', borderRight: '1px solid var(--border)' }}>
                {period.period_end}
              </div>

              {/* FY End */}
              <div style={{ padding: '4px 12px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                {period.fiscal_year_end
                  ? <CalendarCheck size={12} style={{ color: 'var(--accent)' }} />
                  : <span style={{ color: 'var(--border-strong)', fontSize: 10 }}>—</span>
                }
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5" style={{ padding: '4px 12px', borderRight: '1px solid var(--border)' }}>
                {period.is_closed ? (
                  <>
                    <Lock size={10} style={{ color: 'var(--ink-negative)', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--ink-negative)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Closed</span>
                  </>
                ) : (
                  <>
                    <Unlock size={10} style={{ color: 'var(--ink-positive)', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--ink-positive)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Open</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={{ padding: '4px 12px' }}>
                {!period.is_closed && (
                  <button
                    className="flex items-center gap-1 text-[10px]"
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2,
                      color: 'var(--ink-2)', padding: '2px 8px', cursor: 'pointer',
                    }}
                  >
                    <Lock size={9} />Close Period
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && <AddPeriodModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
