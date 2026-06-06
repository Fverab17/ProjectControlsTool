import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FolderOpen, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { Project } from '../../types/projects'

interface Props {
  projects: Project[]
  focusedId: string | null
  focusedIdx: number
  isLoading: boolean
  onFocus: (id: string) => void
  onOpen: (id: string) => void
  onNavigate: (delta: number) => void
}

interface ColDef {
  id: string
  label: string
  fixed: boolean
  defaultOn: boolean
  width: number
  align?: 'right'
  render: (p: Project) => string | null
}

const ALL_COLS: ColDef[] = [
  { id: 'code',               label: 'Project ID',      fixed: true,  defaultOn: true,  width: 110,  render: p => p.code },
  { id: 'title',              label: 'Project Title',   fixed: false, defaultOn: true,  width: 200,  render: p => p.title },
  { id: 'base_currency_code', label: 'Currency',        fixed: false, defaultOn: false, width: 72,   render: p => p.base_currency_code },
  { id: 'baseline_start',     label: 'Baseline Start',  fixed: false, defaultOn: false, width: 96,   render: p => p.baseline_start ?? '—' },
  { id: 'baseline_finish',    label: 'Baseline Finish', fixed: false, defaultOn: false, width: 96,   render: p => p.baseline_finish ?? '—' },
  { id: 'control_start',      label: 'Control Start',   fixed: false, defaultOn: false, width: 96,   render: p => p.control_start ?? '—' },
  { id: 'control_finish',     label: 'Control Finish',  fixed: false, defaultOn: false, width: 96,   render: p => p.control_finish ?? '—' },
  { id: 'cost_budget',        label: 'BAC',             fixed: false, defaultOn: false, width: 80,   align: 'right', render: p => p.cost_budget  != null ? `${(p.cost_budget  / 1_000_000).toFixed(1)}M` : '—' },
  { id: 'cost_actual',        label: 'Actual',          fixed: false, defaultOn: false, width: 80,   align: 'right', render: p => p.cost_actual  != null ? `${(p.cost_actual  / 1_000_000).toFixed(1)}M` : '—' },
  { id: 'cost_eac',           label: 'EAC',             fixed: false, defaultOn: false, width: 80,   align: 'right', render: p => p.cost_eac     != null ? `${(p.cost_eac     / 1_000_000).toFixed(1)}M` : '—' },
]

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2,
        color: disabled ? 'var(--ink-muted)' : 'var(--ink-2)', cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const btnBase: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2,
  color: 'var(--ink-2)', fontSize: 11, padding: '2px 7px',
  display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
}

export function ProjectNavPanel({ projects, focusedId, focusedIdx, isLoading, onFocus, onOpen, onNavigate }: Props) {
  const [width, setWidth] = useState(340)
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () => new Set(ALL_COLS.filter(c => c.defaultOn).map(c => c.id))
  )
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const onMove = (ev: MouseEvent) => setWidth(Math.max(200, Math.min(900, startW + ev.clientX - startX)))
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const toggleCol = (id: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const activeCols = ALL_COLS.filter(c => visibleCols.has(c.id))
  const gridTemplate = activeCols.map(c => c.id === 'title' ? '1fr' : `${c.width}px`).join(' ')

  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{ width, position: 'relative', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={startResize}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 4,
          cursor: 'col-resize', zIndex: 10,
          background: 'transparent', transition: 'background 120ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      />

      {/* Panel header */}
      <div
        className="px-3 py-1.5 text-[11px] font-semibold tracking-wide flex-shrink-0"
        style={{ background: 'var(--panel-header-bg)', color: 'var(--panel-header-ink)' }}
      >
        Projects — Navigation
      </div>

      {/* Nav controls */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}
      >
        <span className="num text-[10.5px] mr-1 flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
          {focusedIdx >= 0 ? focusedIdx + 1 : '—'} of {projects.length}
        </span>
        <NavBtn onClick={() => onNavigate(-focusedIdx)} disabled={focusedIdx <= 0}><ChevronsLeft size={11} /></NavBtn>
        <NavBtn onClick={() => onNavigate(-1)} disabled={focusedIdx <= 0}><ChevronLeft size={11} /></NavBtn>
        <NavBtn onClick={() => onNavigate(1)} disabled={focusedIdx >= projects.length - 1}><ChevronRight size={11} /></NavBtn>
        <NavBtn onClick={() => onNavigate(projects.length - 1 - focusedIdx)} disabled={focusedIdx >= projects.length - 1}><ChevronsRight size={11} /></NavBtn>
        <div className="flex-1" />
        <button style={btnBase}><Plus size={10} />Add</button>
        <button style={btnBase}><Trash2 size={10} />Delete</button>

        {/* Column picker */}
        <div style={{ position: 'relative' }} ref={pickerRef}>
          <button
            style={{
              ...btnBase, padding: '2px 6px',
              background: showPicker ? 'var(--accent-soft)' : 'var(--surface)',
              borderColor: showPicker ? 'var(--accent)' : 'var(--border)',
            }}
            onClick={() => setShowPicker(v => !v)}
            title="Choose columns"
          >
            <SlidersHorizontal size={10} />
          </button>

          {showPicker && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 3px)', zIndex: 200,
              background: 'var(--surface)', border: '1px solid var(--border-strong)',
              borderRadius: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              minWidth: 190, padding: '4px 0',
            }}>
              <div style={{
                padding: '3px 10px 6px', fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--ink-3)',
                borderBottom: '1px solid var(--border)',
              }}>
                Visible Columns
              </div>
              {ALL_COLS.map(col => (
                <label
                  key={col.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 10px', fontSize: 12,
                    cursor: col.fixed ? 'default' : 'pointer',
                    color: col.fixed ? 'var(--ink-muted)' : 'var(--ink-1)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.id)}
                    disabled={col.fixed}
                    onChange={() => !col.fixed && toggleCol(col.id)}
                    style={{ accentColor: 'var(--accent)', cursor: col.fixed ? 'default' : 'pointer' }}
                  />
                  {col.label}
                  {col.fixed && (
                    <span style={{ fontSize: 9, color: 'var(--ink-muted)', marginLeft: 'auto', letterSpacing: '0.05em' }}>
                      always
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          style={{ ...btnBase, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
          onClick={() => focusedId && onOpen(focusedId)}
        >
          <FolderOpen size={10} />Open
        </button>
      </div>

      {/* Column headers */}
      <div
        className="grid flex-shrink-0"
        style={{
          gridTemplateColumns: gridTemplate,
          background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)',
          fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}
      >
        {activeCols.map(col => (
          <div key={col.id} style={{ padding: '4px 8px', textAlign: col.align }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-[11px]" style={{ color: 'var(--ink-muted)' }}>Loading…</div>
        ) : projects.map(p => {
          const isFocused = p.id === focusedId
          return (
            <div
              key={p.id}
              onClick={() => onFocus(p.id)}
              onDoubleClick={() => onOpen(p.id)}
              className="grid items-center cursor-pointer"
              style={{
                gridTemplateColumns: gridTemplate,
                borderBottom: '1px solid var(--border)',
                background: isFocused ? 'var(--accent-soft)' : 'transparent',
                borderLeft: isFocused ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {activeCols.map(col => (
                <div
                  key={col.id}
                  className={col.id === 'code' ? 'num' : ''}
                  style={{
                    padding: '6px 8px',
                    fontSize: 11,
                    fontWeight: col.id === 'code' ? 500 : 400,
                    color: isFocused
                      ? 'var(--accent)'
                      : col.id === 'code' ? 'var(--ink-2)' : 'var(--ink-1)',
                    textAlign: col.align,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {col.render(p)}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
