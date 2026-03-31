import type { Chapter } from '../types'

export function storyMatchesQuery(
  title: string,
  description: string,
  genre: string,
  q: string,
): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return (
    title.toLowerCase().includes(s) ||
    description.toLowerCase().includes(s) ||
    genre.toLowerCase().includes(s)
  )
}

export function filterChaptersByQuery(chapters: Chapter[], q: string): Chapter[] {
  const s = q.trim().toLowerCase()
  if (!s) return chapters
  return chapters.filter(
    (c) =>
      c.title.toLowerCase().includes(s) ||
      (c.content && c.content.toLowerCase().includes(s)),
  )
}
