import { useEffect, useState } from 'react'
import { usePeriodReport } from '../../hooks/usePeriodReport'

interface Props { projectId: string; period: string }

const STATUS_OPTIONS = [
  { value: 'green', label: 'Green', color: '#2e7d32' },
  { value: 'amber', label: 'Amber', color: '#e65100' },
  { value: 'red',   label: 'Red',   color: '#c62828' },
] as const

const labelSt: React.CSSProperties = {
  fontSize: 9.5, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 4,
}

const textArea: React.CSSProperties = {
  width: '100%', resize: 'vertical',
  background: 'var(--surface)', border: '1px solid var(--border-strong)',
  borderRadius: 2, padding: '6px 8px',
  fontSize: 11.5, color: 'var(--ink-1)',
  lineHeight: 1.55, fontFamily: 'inherit',
  minHeight: 72,
}

export function PeriodReportTab({ projectId, period }: Props) {
  const { data, isLoading, save } = usePeriodReport(projectId, period)

  const [color,     setColor]     = useState<'green' | 'amber' | 'red'>('green')
  const [status,    setStatus]    = useState('')
  const [risks,     setRisks]     = useState('')
  const [learnings, setLearnings] = useState('')
  const [dirty,     setDirty]     = useState(false)
  const [saved,     setSaved]     = useState(false)

  useEffect(() => {
    if (!data) return
    setColor(data.status_color as 'green' | 'amber' | 'red')
    setStatus(data.status_narrative ?? '')
    setRisks(data.risks_narrative ?? '')
    setLearnings(data.learnings_narrative ?? '')
    setDirty(false)
  }, [data])

  function handleChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setter(e.target.value)
      setDirty(true)
      setSaved(false)
    }
  }

  async function handleSave() {
    await save.mutateAsync({
      status_color: color,
      status_narrative:    status    || null,
      risks_narrative:     risks     || null,
      learnings_narrative: learnings || null,
    })
    setDirty(false)
    setSaved(true)
  }

  if (isLoading) return (
    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Loading…</div>
  )

  const dot = STATUS_OPTIONS.find(o => o.value === color)

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 760 }}>

      {/* Period badge + status selector */}
      <div className="flex items-center gap-4">
        <div>
          <div style={labelSt}>Period</div>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--accent)' }}>
            {period}
          </div>
        </div>
        <div>
          <div style={labelSt}>Status</div>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setColor(opt.value); setDirty(true); setSaved(false) }}
                className="flex items-center gap-1.5 px-3 py-1 rounded"
                style={{
                  fontSize: 11, fontWeight: 500,
                  border: `1px solid ${color === opt.value ? opt.color : 'var(--border-strong)'}`,
                  background: color === opt.value ? opt.color + '18' : 'transparent',
                  color: color === opt.value ? opt.color : 'var(--ink-3)',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: color === opt.value ? opt.color : 'var(--border-strong)',
                  flexShrink: 0,
                }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {dot && (
          <div className="flex items-center gap-1.5 ml-2" style={{ fontSize: 11, color: dot.color }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot.color, display: 'inline-block' }} />
            {dot.label}
          </div>
        )}
      </div>

      {/* Status Narrative */}
      <div>
        <div style={labelSt}>Period Status Narrative</div>
        <textarea
          style={textArea}
          rows={4}
          placeholder="Summarise what happened this period, key accomplishments, schedule health…"
          value={status}
          onChange={handleChange(setStatus)}
        />
      </div>

      {/* Risks */}
      <div>
        <div style={labelSt}>Risks</div>
        <textarea
          style={textArea}
          rows={3}
          placeholder="Key risks identified or active this period, likelihood, potential impact, mitigation actions…"
          value={risks}
          onChange={handleChange(setRisks)}
        />
      </div>

      {/* Learnings */}
      <div>
        <div style={labelSt}>Learnings</div>
        <textarea
          style={textArea}
          rows={3}
          placeholder="Lessons learned, process improvements, anything worth capturing for future projects…"
          value={learnings}
          onChange={handleChange(setLearnings)}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!dirty || save.isPending}
          className="px-4 py-1.5 rounded"
          style={{
            fontSize: 11, fontWeight: 600,
            background: 'var(--accent)', color: '#fff',
            opacity: !dirty || save.isPending ? 0.4 : 1,
            cursor: !dirty || save.isPending ? 'default' : 'pointer',
          }}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        {saved && !dirty && (
          <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>Saved</span>
        )}
        {save.isError && (
          <span style={{ fontSize: 10.5, color: 'var(--ink-negative, #c62828)' }}>Save failed</span>
        )}
      </div>
    </div>
  )
}
