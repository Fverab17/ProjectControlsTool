import { useState } from 'react'
import { useProjects } from '../../hooks/useProjects'
import { useProject } from '../../hooks/useProject'
import { ProjectsRibbon } from './ProjectsRibbon'
import { ProjectNavPanel } from './ProjectNavPanel'
import { ProjectDataPanel } from './ProjectDataPanel'
import { ProjectDetailTabs } from './ProjectDetailTabs'
import { LayoutGrid, X } from 'lucide-react'

interface Props {
  selectedProjectId: string | null
  onOpenProject: (id: string) => void
}

export function ProjectsScreen({ selectedProjectId, onOpenProject }: Props) {
  const { data: projects = [], isLoading } = useProjects()
  const [focusedId, setFocusedId] = useState<string | null>(selectedProjectId)
  const [bottomTab, setBottomTab] = useState('members')

  const { data: projectDetail } = useProject(focusedId)

  const focusedProject = projects.find(p => p.id === focusedId) ?? null
  const focusedIdx = projects.findIndex(p => p.id === focusedId)

  const navigate = (delta: number) => {
    const next = projects[focusedIdx + delta]
    if (next) setFocusedId(next.id)
  }

  return (
    <div className="h-full flex flex-col">
      <ProjectsRibbon onOpen={() => focusedId && onOpenProject(focusedId)} />

      {/* Tab bar */}
      <div
        className="flex items-end flex-shrink-0 px-3 gap-1"
        style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)' }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] font-medium"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderBottom: '1px solid var(--surface)',
            borderRadius: '2px 2px 0 0',
            color: 'var(--ink-1)',
            marginBottom: -1,
          }}
        >
          <LayoutGrid size={11} style={{ color: 'var(--accent)' }} />
          Projects
          <button className="opacity-30 hover:opacity-80 ml-1"><X size={11} /></button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <ProjectNavPanel
          projects={projects}
          focusedId={focusedId}
          focusedIdx={focusedIdx}
          isLoading={isLoading}
          onFocus={setFocusedId}
          onOpen={onOpenProject}
          onNavigate={navigate}
        />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ProjectDataPanel project={projectDetail ?? focusedProject} />
          <ProjectDetailTabs detail={projectDetail ?? null} tab={bottomTab} setTab={setBottomTab} />
        </div>
      </div>
    </div>
  )
}
