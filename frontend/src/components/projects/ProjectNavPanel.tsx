import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FolderOpen, Plus, Trash2 } from 'lucide-react'
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
  return (
    <div
      className="flex-shrink-0 flex flex-col border-r overflow-hidden"
      style={{ width: 340, background: 'var(--surface)' }}
    >
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
        <button
          style={{ ...btnBase, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
          onClick={() => focusedId && onOpen(focusedId)}
        >
          <FolderOpen size={10} />Open
        </button>
      </div>

      {/* Column headers */}
      <div
        className="grid px-2 py-1 flex-shrink-0"
        style={{
          gridTemplateColumns: '120px 1fr',
          background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)',
          fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}
      >
        <div>Project ID</div>
        <div>Project Title</div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-[11px]" style={{ color: 'var(--ink-muted)' }}>Loading…</div>
        ) : projects.map(p => (
          <div
            key={p.id}
            onClick={() => onFocus(p.id)}
            onDoubleClick={() => onOpen(p.id)}
            className="grid items-center cursor-pointer"
            style={{
              gridTemplateColumns: '120px 1fr',
              borderBottom: '1px solid var(--border)',
              background: p.id === focusedId ? 'var(--accent-soft)' : 'transparent',
              borderLeft: p.id === focusedId ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            <div
              className="px-2 py-2 num text-[11px] font-medium"
              style={{ color: p.id === focusedId ? 'var(--accent)' : 'var(--ink-2)' }}
            >
              {p.code}
            </div>
            <div
              className="px-2 py-2 text-[11px]"
              style={{ color: p.id === focusedId ? 'var(--accent)' : 'var(--ink-1)' }}
            >
              {p.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
