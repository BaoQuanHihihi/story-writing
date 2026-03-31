import { DEFAULT_SETTINGS, type AppSettings } from '../types'

const SETTINGS_KEY = 'writenest:settings'
const ONBOARDING_KEY = 'writenest:onboardingSeen'
const STATS_KEY = 'writenest:dailyWords'
export const CONTINUE_KEY = 'writenest:continue'

export interface ContinuePointer {
  storyId: string
  chapterId: string
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export function getOnboardingSeen(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1'
}

export function setOnboardingSeen() {
  localStorage.setItem(ONBOARDING_KEY, '1')
}

/** yyyy-mm-dd -> words written (best-effort local tally). */
export function getDailyWordsRecord(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

export function bumpDailyWords(delta: number) {
  if (delta <= 0) return
  const key = new Date().toISOString().slice(0, 10)
  const rec = getDailyWordsRecord()
  rec[key] = (rec[key] ?? 0) + delta
  localStorage.setItem(STATS_KEY, JSON.stringify(rec))
}

export function saveContinuePointer(p: ContinuePointer | null) {
  if (!p) localStorage.removeItem(CONTINUE_KEY)
  else localStorage.setItem(CONTINUE_KEY, JSON.stringify(p))
}

export function loadContinuePointer(): ContinuePointer | null {
  try {
    const raw = localStorage.getItem(CONTINUE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ContinuePointer
  } catch {
    return null
  }
}

export function applyThemeClass(theme: AppSettings['theme']) {
  const root = document.documentElement
  root.classList.remove('dark')
  if (theme === 'dark') root.classList.add('dark')
  else if (theme === 'system') {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    }
  }
}
