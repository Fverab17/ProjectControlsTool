export const fmt = (n: number | null | undefined, decimals = 0): string => {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const pctFmt = (n: number): string => (n * 100).toFixed(1) + '%'

export const cpiColor = (cpi: number): string => {
  if (cpi >= 1) return 'var(--ink-positive)'
  if (cpi >= 0.95) return 'var(--ink-warning)'
  return 'var(--ink-negative)'
}

export const vacColor = (vac: number, budget: number): string => {
  const pct = budget > 0 ? vac / budget : 0
  if (pct > 0.02) return 'var(--ink-positive)'
  if (pct < -0.02) return 'var(--ink-negative)'
  return 'var(--ink-muted)'
}
