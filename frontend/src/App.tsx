import { useEffect, useState } from 'react'
import { useProjects } from './hooks/useProjects'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { ProjectsScreen } from './components/projects/ProjectsScreen'
import { CostControl } from './components/cost-control/CostControl'
import { PlaceholderScreen } from './components/shared/PlaceholderScreen'
import { ChangeManagement } from './components/changes/ChangeManagement'
import { ProjectSetup } from './components/setup/ProjectSetup'

export default function App() {
  const [screen, setScreen] = useState('projects')
  const [period, setPeriod] = useState('2024-04')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const { data: projects } = useProjects()

  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const selectedProject = projects?.find(p => p.id === selectedProjectId) ?? null

  const handleOpenProject = (id: string) => {
    setSelectedProjectId(id)
    setScreen('cost-control')
  }

  return (
    <div
      className="h-screen w-full flex font-sans text-[13px]"
      style={{
        fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        background: 'var(--app-bg)',
        color: 'var(--ink-1)',
      }}
    >
      <Sidebar screen={screen} setScreen={setScreen} project={selectedProject} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar period={period} setPeriod={setPeriod} screen={screen} />
        <div className="flex-1 overflow-hidden">
          {screen === 'projects' && (
            <ProjectsScreen
              selectedProjectId={selectedProjectId}
              onOpenProject={handleOpenProject}
              period={period}
            />
          )}
          {screen === 'cost-control' && selectedProjectId ? (
            <CostControl projectId={selectedProjectId} period={period} />
          ) : screen === 'cost-control' && (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
              Open a project first from the Projects screen.
            </div>
          )}
          {screen === 'setup' && selectedProjectId ? (
            <ProjectSetup projectId={selectedProjectId} />
          ) : screen === 'setup' && (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
              Open a project first from the Projects screen.
            </div>
          )}
          {screen === 'evm'         && <PlaceholderScreen label="EVM Dashboard" />}
          {screen === 'changes' && selectedProjectId ? (
            <ChangeManagement projectId={selectedProjectId} />
          ) : screen === 'changes' && (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
              Open a project first from the Projects screen.
            </div>
          )}
          {screen === 'procurement' && <PlaceholderScreen label="Procurement" />}
          {screen === 'reports'     && <PlaceholderScreen label="Reports" />}
        </div>
      </main>
    </div>
  )
}
