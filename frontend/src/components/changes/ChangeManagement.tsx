import { useState } from 'react'
import { useChangeOrders, useChangeOrder } from '../../hooks/useChangeOrders'
import { ChangeNavPanel } from './ChangeNavPanel'
import { ChangeDataPanel } from './ChangeDataPanel'
import { ChangeLinesGrid } from './ChangeLinesGrid'
import { ChangeFormModal } from './ChangeFormModal'

interface Props { projectId: string }

export function ChangeManagement({ projectId }: Props) {
  const { data: orders = [], isLoading: ordersLoading, error } = useChangeOrders(projectId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)

  const effectiveId = selectedId ?? orders[0]?.id ?? null
  const { data: detail, isLoading: detailLoading } = useChangeOrder(projectId, effectiveId)

  const handleSaved = (id: string) => {
    setSelectedId(id)
    setModal(null)
  }

  if (ordersLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-negative)', fontSize: 13 }}>
        Failed to load data. Is the backend running?
      </div>
    )
  }

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex-1 flex min-h-0">
          <ChangeNavPanel
            orders={orders}
            selectedId={effectiveId}
            onSelect={setSelectedId}
            onAdd={() => setModal('create')}
          />
          <ChangeDataPanel
            detail={detail}
            isLoading={detailLoading && !!effectiveId}
            onEdit={() => setModal('edit')}
          />
        </div>
        <ChangeLinesGrid projectId={projectId} coId={effectiveId} lines={detail?.lines ?? []} />
      </div>

      {modal === 'create' && (
        <ChangeFormModal
          projectId={projectId}
          initial={null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal === 'edit' && detail && (
        <ChangeFormModal
          projectId={projectId}
          initial={detail}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
