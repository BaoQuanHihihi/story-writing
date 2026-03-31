import { useCallback, useEffect, useState } from 'react'
import type { Character, Chapter, Snapshot, SnapshotType, TimelineEvent } from '../../types'
import { cn } from '../../lib/cn'
import {
  addSnapshot,
  deleteSnapshot,
  listSnapshotsForChapter,
  saveChapterContent,
  setSnapshotPinned,
} from '../../db/chapterService'
import { db } from '../../db/database'
import { formatRelative } from '../../lib/formatTime'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'

export type RightTab = 'notes' | 'chars' | 'time' | 'history'

function snapshotTypeLabel(t: SnapshotType): string {
  switch (t) {
    case 'autosave':
      return 'tự động'
    case 'manual':
      return 'thủ công'
    case 'checkpoint':
      return 'mốc'
    default:
      return t
  }
}

export function RightPanel({
  tab,
  onTab,
  chapter,
  characters,
  timeline,
  onRefreshSnapshots,
}: {
  tab: RightTab
  onTab: (t: RightTab) => void
  chapter: Chapter
  characters: Character[]
  timeline: TimelineEvent[]
  onRefreshSnapshots?: () => void
}) {
  const tabs: { id: RightTab; label: string }[] = [
    { id: 'notes', label: 'Ghi chú' },
    { id: 'chars', label: 'Nhân vật' },
    { id: 'time', label: 'Thời gian' },
    { id: 'history', label: 'Lịch sử' },
  ]

  const inChapterChars = characters.filter((c) => c.linkedChapterIds.includes(chapter.id))

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-[var(--wn-border)] bg-[var(--wn-surface)]">
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--wn-border)] p-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
              tab === t.id
                ? 'bg-[var(--wn-surface-2)] text-[var(--wn-text)]'
                : 'text-[var(--wn-muted)] hover:bg-[var(--wn-surface-2)]',
            )}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'notes' ? <ChapterNotesEditor chapter={chapter} /> : null}
        {tab === 'chars' ? <CharList items={inChapterChars} all={characters} /> : null}
        {tab === 'time' ? <TimelineList events={timeline} chapterId={chapter.id} /> : null}
        {tab === 'history' ? (
          <HistoryPanel
            chapter={chapter}
            onRestored={() => onRefreshSnapshots?.()}
          />
        ) : null}
      </div>
    </aside>
  )
}

function ChapterNotesEditor({ chapter }: { chapter: Chapter }) {
  const [notes, setNotes] = useState(chapter.notes)
  useEffect(() => setNotes(chapter.notes), [chapter.id, chapter.notes])

  const save = useCallback(async () => {
    const fresh = await db.chapters.get(chapter.id)
    if (!fresh) return
    await saveChapterContent(chapter.id, fresh.content, { notes })
  }, [chapter.id, notes])

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--wn-muted)]">Ghi chú chương</p>
      <Textarea
        aria-label="Ghi chú chương"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => void save()}
        className="min-h-[200px] font-sans text-sm"
      />
      <p className="text-[11px] text-[var(--wn-muted)]">Lưu khi bạn rời khỏi ô này.</p>
    </div>
  )
}

function CharList({ items, all }: { items: Character[]; all: Character[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--wn-border)] p-4 text-sm text-[var(--wn-muted)]">
        Chưa có nhân vật gắn với chương này. Mở mục <strong className="text-[var(--wn-text)]">Nhân vật</strong> ở kệ
        trái để gắn nhân vật.
        <p className="mt-2 text-xs">Tất cả nhân vật ({all.length}) nằm trong hồ sơ truyện.</p>
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li key={c.id} className="rounded-xl border border-[var(--wn-border)] bg-[var(--wn-surface-2)] p-3 text-sm">
          <p className="font-medium text-[var(--wn-text)]">{c.name}</p>
          <p className="text-xs text-[var(--wn-muted)]">{c.role}</p>
          <p className="mt-2 line-clamp-4 text-[var(--wn-text)]">{c.description || 'Chưa có mô tả.'}</p>
        </li>
      ))}
    </ul>
  )
}

function TimelineList({ events, chapterId }: { events: TimelineEvent[]; chapterId: string }) {
  const related = events.filter((e) => e.relatedChapterId === chapterId || !e.relatedChapterId)
  if (related.length === 0) {
    return <p className="text-sm text-[var(--wn-muted)]">Chưa có mốc thời gian.</p>
  }
  return (
    <ul className="space-y-3 text-sm">
      {related.map((e) => (
        <li key={e.id} className="rounded-xl border border-[var(--wn-border)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--wn-muted)]">{e.dateLabel}</p>
          <p className="font-medium text-[var(--wn-text)]">{e.title}</p>
          <p className="mt-1 text-[var(--wn-muted)]">{e.description}</p>
        </li>
      ))}
    </ul>
  )
}

function HistoryPanel({ chapter, onRestored }: { chapter: Chapter; onRestored: () => void }) {
  const [snaps, setSnaps] = useState<Snapshot[]>([])

  const reload = useCallback(async () => {
    setSnaps(await listSnapshotsForChapter(chapter.id))
  }, [chapter.id])

  useEffect(() => {
    void reload()
  }, [reload])

  const checkpoint = async () => {
    await addSnapshot(chapter.storyId, chapter.id, chapter.content, 'checkpoint', true)
    await reload()
    onRestored()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--wn-muted)]">Lịch sử phiên bản</p>
        <Button className="!px-2 !py-1 text-xs" variant="secondary" type="button" onClick={() => void checkpoint()}>
          Ghim mốc
        </Button>
      </div>
      <ul className="space-y-2">
        {snaps.map((s) => (
          <li key={s.id} className="rounded-xl border border-[var(--wn-border)] p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[var(--wn-muted)]">
                {formatRelative(s.createdAt)} · {snapshotTypeLabel(s.type)}
                {s.pinned ? ' · đã ghim' : ''}
              </span>
              <div className="flex flex-wrap gap-1">
                <Button
                  className="!px-2 !py-1 text-[11px]"
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    if (!confirm('Thay nội dung chương bằng bản chụp này?')) return
                    await saveChapterContent(chapter.id, s.content)
                    onRestored()
                  }}
                >
                  Khôi phục
                </Button>
                <Button
                  className="!px-2 !py-1 text-[11px]"
                  variant="ghost"
                  type="button"
                  onClick={() => void setSnapshotPinned(s.id, !s.pinned).then(reload)}
                >
                  {s.pinned ? 'Bỏ ghim' : 'Ghim'}
                </Button>
                <Button
                  className="!px-2 !py-1 text-[11px]"
                  variant="ghost"
                  type="button"
                  onClick={() =>
                    void deleteSnapshot(s.id).then(reload)
                  }
                >
                  Xóa
                </Button>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 text-[var(--wn-text)]">{s.content.slice(0, 200)}</p>
          </li>
        ))}
      </ul>
      {snaps.length === 0 ? <p className="text-sm text-[var(--wn-muted)]">Bản chụp sẽ xuất hiện khi bạn viết.</p> : null}
    </div>
  )
}
