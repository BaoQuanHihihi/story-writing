import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const fnRef = useRef(fn)
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  fnRef.current = fn

  useEffect(() => {
    return () => {
      if (tRef.current) clearTimeout(tRef.current)
    }
  }, [])

  return useCallback(
    (...args: Args) => {
      if (tRef.current) clearTimeout(tRef.current)
      tRef.current = setTimeout(() => fnRef.current(...args), delayMs)
    },
    [delayMs],
  )
}
