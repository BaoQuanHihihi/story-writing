import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { applyThemeClass, loadSettings, saveSettings } from '../settings/storage'

const Ctx = createContext<{
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
} | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...DEFAULT_SETTINGS, ...prev, ...patch }
      saveSettings(next)
      applyThemeClass(next.theme)
      return next
    })
  }, [])

  useEffect(() => {
    applyThemeClass(settings.theme)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (settings.theme === 'system') applyThemeClass('system')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings.theme])

  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSettings requires provider')
  return v
}
