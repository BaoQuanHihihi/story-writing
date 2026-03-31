import { useMemo, useState } from 'react'
import type { Chapter } from '../../types'
import { filterChaptersByQuery } from '../../lib/search'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'

export function SearchChaptersModal({
  open,
  onClose,
  chapters,
  onPick,
}: {
  open: boolean
  onClose: () => void
  chapters: Chapter[]
  onPick: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const list = useMemo(() => filterChaptersByQuery(chapters, q), [chapters, q])

  return (
    <Modal open={open} onClose={onClose} title="Tìm chương" className="max-w-lg">
      <label className="sr-only" htmlFor="ch-search">
        Tìm chương
      </label>
      <Input
        id="ch-search"
        autoFocus
        placeholder="Tìm theo tiêu đề hoặc nội dung chương…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="mt-3 max-h-72 space-y-1 overflow-auto">
        {list.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-[var(--wn-surface-2)]"
              onClick={() => {
                onPick(c.id)
                onClose()
                setQ('')
              }}
            >
              <span className="text-sm font-medium text-[var(--wn-text)]">{c.title}</span>
              <span className="line-clamp-2 text-xs text-[var(--wn-muted)]">{c.content.slice(0, 140)}</span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 ? <p className="mt-2 text-sm text-[var(--wn-muted)]">Không có kết quả.</p> : null}
    </Modal>
  )
}
