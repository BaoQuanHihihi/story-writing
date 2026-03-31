/** Rough word count for markdown-ish text. */
export function countWords(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

export function readingMinutes(wordCount: number, wpm = 200): number {
  if (wordCount <= 0) return 0
  return Math.max(1, Math.round(wordCount / wpm))
}
