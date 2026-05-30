interface Props { label: string }

export function PlaceholderScreen({ label }: Props) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-[11px] tracking-[0.18em] uppercase mb-2" style={{ color: 'var(--ink-muted)' }}>
          Not built yet
        </div>
        <div className="text-[18px] font-medium" style={{ color: 'var(--ink-2)' }}>{label}</div>
        <div className="mt-2 text-[12px]" style={{ color: 'var(--ink-3)' }}>
          Coming in a future module.
        </div>
      </div>
    </div>
  )
}
