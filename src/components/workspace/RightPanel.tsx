import { useCallback, useEffect, useState } from 'react'
import type { Character, Chapter, Snapshot, TimelineEvent } from '../../types'
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
    { id: 'notes', label: 'Notes' },
    { id: 'chars', label: 'People' },
    { id: 'time', label: 'Time' },
    { id: 'history', label: 'History' },
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
      <p className="text-xs font-medium text-[var(--wn-muted)]">Chapter notes</p>
      <Textarea
        aria-label="Chapter notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => void save()}
        className="min-h-[200px] font-sans text-sm"
      />
      <p className="text-[11px] text-[var(--wn-muted)]">Autosaves when you click away.</p>
    </div>
  )
}

function CharList({ items, all }: { items: Character[]; all: Character[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--wn-border)] p-4 text-sm text-[var(--wn-muted)]">
        No characters linked to this chapter. Open <strong className="text-[var(--wn-text)]">Characters</strong>{' '}
        in the left shelf to attach people to this chapter.
        <p className="mt-2 text-xs">All characters ({all.length}) appear in the story bible.</p>
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li key={c.id} className="rounded-xl border border-[var(--wn-border)] bg-[var(--wn-surface-2)] p-3 text-sm">
          <p className="font-medium text-[var(--wn-text)]">{c.name}</p>
          <p className="text-xs text-[var(--wn-muted)]">{c.role}</p>
          <p className="mt-2 line-clamp-4 text-[var(--wn-text)]">{c.description || 'No description.'}</p>
        </li>
      ))}
    </ul>
  )
}

function TimelineList({ events, chapterId }: { events: TimelineEvent[]; chapterId: string }) {
  const related = events.filter((e) => e.relatedChapterId === chapterId || !e.relatedChapterId)
  if (related.length === 0) {
    return <p className="text-sm text-[var(--wn-muted)]">No timeline beats yet.</p>
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
        <p className="text-xs font-medium text-[var(--wn-muted)]">Revision history</p>
        <Button className="!px-2 !py-1 text-xs" variant="secondary" type="button" onClick={() => void checkpoint()}>
          Pin checkpoint
        </Button>
      </div>
      <ul className="space-y-2">
        {snaps.map((s) => (
          <li key={s.id} className="rounded-xl border border-[var(--wn-border)] p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[var(--wn-muted)]">
                {formatRelative(s.createdAt)} · {s.type}
                {s.pinned ? ' · pinned' : ''}
              </span>
              <div className="flex flex-wrap gap-1">
                <Button
                  className="!px-2 !py-1 text-[11px]"
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    if (!confirm('Replace this chapter with this snapshot?')) return
                    await saveChapterContent(chapter.id, s.content)
                    onRestored()
                  }}
                >
                  Restore
                </Button>
                <Button
                  className="!px-2 !py-1 text-[11px]"
                  variant="ghost"
                  type="button"
                  onClick={() => void setSnapshotPinned(s.id, !s.pinned).then(reload)}
                >
                  {s.pinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button
                  className="!px-2 !py-1 text-[11px]"
                  variant="ghost"
                  type="button"
                  onClick={() =>
                    void deleteSnapshot(s.id).then(reload)
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 text-[var(--wn-text)]">{s.content.slice(0, 200)}</p>
          </li>
        ))}
      </ul>
      {snaps.length === 0 ? <p className="text-sm text-[var(--wn-muted)]">Snapshots appear as you write.</p> : null}
    </div>
  )
}
