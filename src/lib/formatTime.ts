import { formatDistanceToNow } from 'date-fns'

export function formatRelative(ts: number): string {
  return formatDistanceToNow(ts, { addSuffix: true })
}

export function formatSaveAge(lastSaveAt: number | null): string {
  if (!lastSaveAt) return 'Not saved yet'
  return `Saved ${formatDistanceToNow(lastSaveAt, { addSuffix: true })}`
}
