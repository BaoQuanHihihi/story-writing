import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { seedIfEmpty } from '../db/seed'

export function AppBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await seedIfEmpty()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-[var(--wn-muted)] text-sm">
        Opening your desk…
      </div>
    )
  }
  return <>{children}</>
}
