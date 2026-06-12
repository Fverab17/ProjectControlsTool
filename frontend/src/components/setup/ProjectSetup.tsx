import { useState } from 'react'
import { SetupTabBar } from './SetupTabBar'
import { BreakdownTab } from './BreakdownTab'
import { BudgetImportTab } from './BudgetImportTab'
import { PeriodsTab } from './PeriodsTab'
import type { SetupTab } from './SetupTabBar'

interface Props {
  projectId: string
}

export function ProjectSetup({ projectId }: Props) {
  const [activeTab, setActiveTab] = useState<SetupTab>('wbs')

  return (
    <div className="h-full flex flex-col">
      <SetupTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'wbs'      && <BreakdownTab projectId={projectId} structureType="wbs" />}
        {activeTab === 'cbs'      && <BreakdownTab projectId={projectId} structureType="cbs" />}
        {activeTab === 'packages' && <BreakdownTab projectId={projectId} structureType="packages" />}
        {activeTab === 'budget'   && <BudgetImportTab projectId={projectId} />}
        {activeTab === 'periods'  && <PeriodsTab projectId={projectId} />}
      </div>
    </div>
  )
}
