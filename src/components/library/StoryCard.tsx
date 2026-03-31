import { useEffect, useRef, useState } from 'react'
import type { Story, StoryStatus } from '../../types'
import { formatRelative } from '../../lib/formatTime'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'

const statusLabel: Record<StoryStatus, string> = {
  draft: 'Bản nháp',
  ongoing: 'Đang viết',
  completed: 'Hoàn thành',
  paused: 'Tạm dừng',
}

function statusStyles(s: StoryStatus) {
  switch (s) {
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
    case 'ongoing':
      return 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
    case 'paused':
      return 'bg-slate-500/15 text-slate-800 dark:text-slate-200'
    default:
      return 'bg-stone-500/10 text-stone-800 dark:text-stone-200'
  }
}

export function StoryCard({
  story,
  chapterCount,
  wordCount,
  lastEdited,
  onOpen,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}: {
  story: Story
  chapterCount: number
  wordCount: number
  lastEdited: number
  onOpen: () => void
  onRename: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-2xl border border-[var(--wn-border)] bg-[var(--wn-surface)] p-4 shadow-sm transition hover:shadow-[var(--wn-shadow)]',
      )}
      style={
        story.coverColor
          ? { borderTopWidth: 3, borderTopColor: story.coverColor }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="text-left min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--wn-accent)]/40"
        >
          <h3 className="font-semibold text-[var(--wn-text)] truncate">{story.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--wn-muted)]">
            {story.description || 'Chưa có mô tả.'}
          </p>
        </button>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-[var(--wn-muted)] hover:bg-[var(--wn-surface-2)]"
            aria-label={`Thao tác cho truyện «${story.title}»`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋮
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-[var(--wn-border)] bg-[var(--wn-surface)] py-1 text-sm shadow-lg"
            >
              <MenuItem onClick={() => { setMenuOpen(false); onOpen() }}>Mở</MenuItem>
              <MenuItem onClick={() => { setMenuOpen(false); onRename() }}>Đổi tên…</MenuItem>
              <MenuItem onClick={() => { setMenuOpen(false); onDuplicate() }}>Nhân bản</MenuItem>
              <MenuItem onClick={() => { setMenuOpen(false); onExport() }}>Xuất JSON…</MenuItem>
              <MenuItem danger onClick={() => { setMenuOpen(false); onDelete() }}>
                Xóa…
              </MenuItem>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--wn-muted)]">
        <span className="rounded-full bg-[var(--wn-surface-2)] px-2 py-0.5">{story.genre}</span>
        <span>
          {chapterCount} chương
        </span>
        <span>{wordCount.toLocaleString('vi-VN')} chữ</span>
        <span className={cn('rounded-full px-2 py-0.5', statusStyles(story.status))}>
          {statusLabel[story.status]}
        </span>
      </div>
      <p className="mt-3 text-xs text-[var(--wn-muted)]">Sửa {formatRelative(lastEdited)}</p>
      <Button className="mt-4 w-full" variant="secondary" onClick={onOpen}>
        Tiếp tục
      </Button>
    </article>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full px-3 py-2 text-left hover:bg-[var(--wn-surface-2)]',
        danger && 'text-red-600 dark:text-red-400',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
