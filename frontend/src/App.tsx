import { useEffect, useState } from 'react'
import { useProjects } from './hooks/useProjects'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { CostControl } from './components/cost-control/CostControl'
import { PlaceholderScreen } from './components/shared/PlaceholderScreen'

export default function App() {
  const [screen, setScreen] = useState('cost-control')
  const [period, setPeriod] = useState('2024-04')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const { data: projects } = useProjects()

  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const selectedProject = projects?.find(p => p.id === selectedProjectId) ?? null

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
          {screen === 'cost-control' && selectedProjectId ? (
            <CostControl projectId={selectedProjectId} period={period} />
          ) : screen === 'cost-control' ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
              Loading project…
            </div>
          ) : (
            <PlaceholderScreen label={
              screen === 'setup'       ? 'Project Setup'      :
              screen === 'evm'         ? 'EVM Dashboard'      :
              screen === 'changes'     ? 'Change Management'  :
              screen === 'procurement' ? 'Procurement'        :
              'Reports'
            } />
          )}
        </div>
      </main>
    </div>
  )
}
