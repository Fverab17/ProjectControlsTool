import { useState } from 'react'

/**
 * useState that reads its initial value from localStorage and writes back
 * on every change. Values are JSON-serialised so strings, numbers, and
 * plain arrays all work out of the box.
 *
 * For Set<string> callers: store as string[] and convert at the call site.
 */
export function useLocalState<T>(
  key: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) return JSON.parse(stored) as T
    } catch {}
    return initial
  })

  const set = (v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }

  return [value, set]
}
