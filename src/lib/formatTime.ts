import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const locale = vi

export function formatRelative(ts: number): string {
  return formatDistanceToNow(ts, { addSuffix: true, locale })
}

export function formatSaveAge(lastSaveAt: number | null): string {
  if (!lastSaveAt) return 'Chưa lưu'
  return `Đã lưu ${formatDistanceToNow(lastSaveAt, { addSuffix: true, locale })}`
}
