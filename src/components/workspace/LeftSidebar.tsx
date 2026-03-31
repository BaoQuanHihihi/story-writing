import { useCallback, useEffect, useRef, useState } from 'react'
import type { Chapter, Character, OutlineItem, Story, StoryNote, TimelineEvent, WorldEntry } from '../../types'
import { cn } from '../../lib/cn'
import { ChapterList } from './ChapterList'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { formatRelative } from '../../lib/formatTime'
import {
  deleteCharacter,
  deleteNote,
  deleteOutline,
  deleteTimeline,
  deleteWorld,
  listCharacters,
  listNotes,
  listOutline,
  listTimeline,
  listWorld,
  newId,
  upsertCharacter,
  upsertNote,
  upsertOutline,
  upsertTimeline,
  upsertWorld,
} from '../../db/extras'
import { permanentlyDeleteChapter, restoreChapter } from '../../db/chapterService'
import { updateStoryMeta } from '../../db/storyService'

export type ShelfSection =
  | 'overview'
  | 'chapters'
  | 'outline'
  | 'characters'
  | 'world'
  | 'timeline'
  | 'notes'
  | 'trash'

const NAV: { id: ShelfSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'outline', label: 'Outline' },
  { id: 'characters', label: 'Characters' },
  { id: 'world', label: 'World' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notes', label: 'Notes' },
  { id: 'trash', label: 'Trash' },
]

export function LeftSidebar({
  story,
  chapters,
  trashChapters,
  activeChapterId,
  section,
  onSection,
  onSelectChapter,
  onAddChapter,
  onReorder,
  onTrashChapter,
  onRefresh,
  mobileOpen,
  onCloseMobile,
}: {
  story: Story
  chapters: Chapter[]
  trashChapters: Chapter[]
  activeChapterId: string | null
  section: ShelfSection
  onSection: (s: ShelfSection) => void
  onSelectChapter: (id: string) => Promise<void> | void
  onAddChapter: () => Promise<void> | void
  onReorder: (ids: string[]) => Promise<void> | void
  onTrashChapter?: (id: string) => Promise<void> | void
  onRefresh: () => Promise<void> | void
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  const totalWords = chapters.reduce((a, c) => a + c.wordCount, 0)

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-[min(100%,20rem)] -translate-x-full border-r border-[var(--wn-border)] bg-[var(--wn-surface)] transition-transform lg:static lg:z-0 lg:translate-x-0',
          mobileOpen && 'translate-x-0',
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-[var(--wn-border)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wn-muted)]">Shelf</p>
            <nav className="mt-2 grid grid-cols-2 gap-1">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={cn(
                    'rounded-lg px-2 py-1.5 text-left text-xs font-medium',
                    section === n.id
                      ? 'bg-[var(--wn-surface-2)] text-[var(--wn-text)]'
                      : 'text-[var(--wn-muted)] hover:bg-[var(--wn-surface-2)]',
                  )}
                  onClick={() => onSection(n.id)}
                >
                  {n.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {section === 'overview' ? (
              <Overview story={story} totalWords={totalWords} chapterCount={chapters.length} onSaved={onRefresh} />
            ) : null}
            {section === 'chapters' ? (
              <div className="space-y-3">
                <Button className="w-full" variant="secondary" type="button" onClick={() => void onAddChapter()}>
                  New chapter
                </Button>
                {chapters.length === 0 ? (
                  <p className="text-sm text-[var(--wn-muted)]">No chapters yet.</p>
                ) : (
                  <ChapterList
                    chapters={chapters}
                    activeId={activeChapterId}
                    onSelect={(id) => void onSelectChapter(id)}
                    onReorder={(ids) => void onReorder(ids)}
                    onTrashChapter={onTrashChapter}
                  />
                )}
              </div>
            ) : null}
            {section === 'outline' ? <OutlineShelf storyId={story.id} chapters={chapters} onRefresh={onRefresh} /> : null}
            {section === 'characters' ? <CharactersShelf storyId={story.id} chapters={chapters} onRefresh={onRefresh} /> : null}
            {section === 'world' ? <WorldShelf storyId={story.id} onRefresh={onRefresh} /> : null}
            {section === 'timeline' ? <TimelineShelf storyId={story.id} chapters={chapters} onRefresh={onRefresh} /> : null}
            {section === 'notes' ? <NotesShelf storyId={story.id} onRefresh={onRefresh} /> : null}
            {section === 'trash' ? <TrashPanel trash={trashChapters} onRefresh={onRefresh} /> : null}
          </div>
        </div>
      </aside>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close shelf"
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}
    </>
  )
}

function Overview({
  story,
  totalWords,
  chapterCount,
  onSaved,
}: {
  story: Story
  totalWords: number
  chapterCount: number
  onSaved: () => Promise<void> | void
}) {
  const [desc, setDesc] = useState(story.description)
  const [genre, setGenre] = useState(story.genre)
  useEffect(() => {
    setDesc(story.description)
    setGenre(story.genre)
  }, [story.description, story.genre, story.id])
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-[var(--wn-muted)]">Story</p>
      <p className="font-medium text-[var(--wn-text)]">{story.title}</p>
      <label className="text-xs text-[var(--wn-muted)]">Description</label>
      <Textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => void updateStoryMeta(story.id, { description: desc }).then(() => onSaved())}
      />
      <label className="text-xs text-[var(--wn-muted)]">Genre</label>
      <Input
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        onBlur={() => void updateStoryMeta(story.id, { genre }).then(() => onSaved())}
      />
      <div className="rounded-xl border border-[var(--wn-border)] bg-[var(--wn-surface-2)] p-3 text-xs text-[var(--wn-muted)]">
        <p>
          <span className="font-medium text-[var(--wn-text)]">{chapterCount}</span> chapters ·{' '}
          <span className="font-medium text-[var(--wn-text)]">{totalWords.toLocaleString()}</span> words
        </p>
        <p className="mt-1">Last opened {formatRelative(story.lastOpenedAt)}</p>
      </div>
    </div>
  )
}

function TrashPanel({ trash, onRefresh }: { trash: Chapter[]; onRefresh: () => Promise<void> | void }) {
  if (trash.length === 0) {
    return <p className="text-sm text-[var(--wn-muted)]">Trash is empty.</p>
  }
  return (
    <ul className="space-y-2 text-sm">
      {trash.map((c) => (
        <li key={c.id} className="rounded-xl border border-[var(--wn-border)] p-2">
          <p className="truncate font-medium">{c.title}</p>
          <p className="text-xs text-[var(--wn-muted)]">Deleted {c.deletedAt ? formatRelative(c.deletedAt) : ''}</p>
          <div className="mt-2 flex gap-2">
            <Button className="!px-2 !py-1 text-xs" variant="secondary" type="button" onClick={() => void restoreChapter(c.id).then(() => onRefresh())}>
              Restore
            </Button>
            <Button className="!px-2 !py-1 text-xs" variant="danger" type="button" onClick={() => void permanentlyDeleteChapter(c.id).then(() => onRefresh())}>
              Delete forever
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function OutlineShelf({
  storyId,
  chapters,
  onRefresh,
}: {
  storyId: string
  chapters: Chapter[]
  onRefresh: () => Promise<void> | void
}) {
  const [rows, setRows] = useState<OutlineItem[]>([])
  const latestRows = useRef(rows)
  latestRows.current = rows
  const reload = useCallback(async () => setRows(await listOutline(storyId)), [storyId])
  useEffect(() => {
    void reload()
  }, [reload])

  const add = async () => {
    const order = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.order)) + 1
    await upsertOutline({
      id: newId(),
      storyId,
      title: 'Beat',
      summary: '',
      order,
      linkedChapterId: null,
    })
    await reload()
    await onRefresh()
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" variant="secondary" type="button" onClick={() => void add()}>
        Add beat
      </Button>
      {rows.length === 0 ? <p className="text-sm text-[var(--wn-muted)]">No outline yet.</p> : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-[var(--wn-border)] p-2">
            <Input
              value={r.title}
              aria-label="Outline title"
              onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latestRows.current.find((x) => x.id === r.id)
                if (cur) await upsertOutline(cur)
                await onRefresh()
              }}
            />
            <Textarea
              className="mt-2 min-h-[72px] text-xs"
              value={r.summary}
              onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, summary: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latestRows.current.find((x) => x.id === r.id)
                if (cur) await upsertOutline(cur)
                await onRefresh()
              }}
            />
            <div className="mt-2 flex items-center gap-2">
              <label className="text-[11px] text-[var(--wn-muted)]">Linked chapter</label>
              <select
                className="flex-1 rounded-lg border border-[var(--wn-border)] bg-[var(--wn-surface)] px-2 py-1 text-xs"
                value={r.linkedChapterId ?? ''}
                onChange={async (e) => {
                  const v = e.target.value || null
                  const cur = { ...r, linkedChapterId: v }
                  await upsertOutline(cur)
                  await reload()
                  await onRefresh()
                }}
              >
                <option value="">None</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="mt-2 !px-2 !py-1 text-xs"
              variant="ghost"
              type="button"
              onClick={() => void deleteOutline(r.id).then(reload).then(() => onRefresh())}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CharactersShelf({
  storyId,
  chapters,
  onRefresh,
}: {
  storyId: string
  chapters: Chapter[]
  onRefresh: () => Promise<void> | void
}) {
  const [rows, setRows] = useState<Character[]>([])
  const latest = useRef(rows)
  latest.current = rows
  const reload = useCallback(async () => setRows(await listCharacters(storyId)), [storyId])
  useEffect(() => {
    void reload()
  }, [reload])

  const add = async () => {
    await upsertCharacter({
      id: newId(),
      storyId,
      name: 'New character',
      role: '',
      description: '',
      personality: '',
      goals: '',
      relationships: '',
      notes: '',
      linkedChapterIds: [],
    })
    await reload()
    await onRefresh()
  }

  const toggleChapter = async (c: Character, chapterId: string) => {
    const has = c.linkedChapterIds.includes(chapterId)
    const linkedChapterIds = has ? c.linkedChapterIds.filter((id) => id !== chapterId) : [...c.linkedChapterIds, chapterId]
    await upsertCharacter({ ...c, linkedChapterIds })
    await reload()
    await onRefresh()
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" variant="secondary" type="button" onClick={() => void add()}>
        Add character
      </Button>
      {rows.length === 0 ? <p className="text-sm text-[var(--wn-muted)]">No characters yet.</p> : null}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-[var(--wn-border)] p-2 text-xs">
            <Input
              value={r.name}
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertCharacter(cur)
                await onRefresh()
              }}
            />
            <Input
              className="mt-2"
              value={r.role}
              placeholder="Role"
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, role: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertCharacter(cur)
                await onRefresh()
              }}
            />
            <Textarea
              className="mt-2 min-h-[80px]"
              value={r.description}
              placeholder="Description"
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, description: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertCharacter(cur)
                await onRefresh()
              }}
            />
            <p className="mt-2 text-[11px] font-medium text-[var(--wn-muted)]">Appearances</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {chapters.map((ch) => {
                const on = r.linkedChapterIds.includes(ch.id)
                return (
                  <button
                    key={ch.id}
                    type="button"
                    className={cn(
                      'rounded-full px-2 py-0.5',
                      on ? 'bg-[var(--wn-accent-soft)] text-[var(--wn-text)]' : 'bg-[var(--wn-surface-2)] text-[var(--wn-muted)]',
                    )}
                    onClick={() => void toggleChapter(r, ch.id)}
                  >
                    {ch.title}
                  </button>
                )
              })}
            </div>
            <Button className="mt-2 !px-2 !py-1" variant="ghost" type="button" onClick={() => void deleteCharacter(r.id).then(reload).then(() => onRefresh())}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function WorldShelf({ storyId, onRefresh }: { storyId: string; onRefresh: () => Promise<void> | void }) {
  const [rows, setRows] = useState<WorldEntry[]>([])
  const latest = useRef(rows)
  latest.current = rows
  const reload = useCallback(async () => setRows(await listWorld(storyId)), [storyId])
  useEffect(() => {
    void reload()
  }, [reload])
  const now = Date.now

  const add = async () => {
    const order = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.order)) + 1
    await upsertWorld({
      id: newId(),
      storyId,
      title: 'Lore note',
      content: '',
      order,
      updatedAt: now(),
    })
    await reload()
    await onRefresh()
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" variant="secondary" type="button" onClick={() => void add()}>
        Add entry
      </Button>
      {rows.length === 0 ? <p className="text-sm text-[var(--wn-muted)]">No world notes yet.</p> : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-[var(--wn-border)] p-2">
            <Input
              value={r.title}
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertWorld({ ...cur, updatedAt: now() })
                await onRefresh()
              }}
            />
            <Textarea
              className="mt-2 min-h-[100px] text-xs"
              value={r.content}
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, content: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertWorld({ ...cur, updatedAt: now() })
                await onRefresh()
              }}
            />
            <Button className="mt-2 !px-2 !py-1 text-xs" variant="ghost" type="button" onClick={() => void deleteWorld(r.id).then(reload).then(() => onRefresh())}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TimelineShelf({
  storyId,
  chapters,
  onRefresh,
}: {
  storyId: string
  chapters: Chapter[]
  onRefresh: () => Promise<void> | void
}) {
  const [rows, setRows] = useState<TimelineEvent[]>([])
  const latest = useRef(rows)
  latest.current = rows
  const reload = useCallback(async () => setRows(await listTimeline(storyId)), [storyId])
  useEffect(() => {
    void reload()
  }, [reload])

  const add = async () => {
    const order = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.order)) + 1
    await upsertTimeline({
      id: newId(),
      storyId,
      title: 'Event',
      description: '',
      relatedChapterId: null,
      order,
      dateLabel: '',
    })
    await reload()
    await onRefresh()
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" variant="secondary" type="button" onClick={() => void add()}>
        Add event
      </Button>
      {rows.length === 0 ? <p className="text-sm text-[var(--wn-muted)]">No timeline events yet.</p> : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-[var(--wn-border)] p-2 text-xs">
            <Input
              value={r.dateLabel}
              placeholder="When"
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, dateLabel: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertTimeline(cur)
                await onRefresh()
              }}
            />
            <Input
              className="mt-2"
              value={r.title}
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertTimeline(cur)
                await onRefresh()
              }}
            />
            <Textarea
              className="mt-2 min-h-[72px]"
              value={r.description}
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, description: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertTimeline(cur)
                await onRefresh()
              }}
            />
            <label className="mt-2 block text-[11px] text-[var(--wn-muted)]">Related chapter</label>
            <select
              className="mt-1 w-full rounded-lg border border-[var(--wn-border)] bg-[var(--wn-surface)] px-2 py-1"
              value={r.relatedChapterId ?? ''}
              onChange={async (e) => {
                const v = e.target.value || null
                await upsertTimeline({ ...r, relatedChapterId: v })
                await reload()
                await onRefresh()
              }}
            >
              <option value="">Story-wide</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <Button className="mt-2 !px-2 !py-1" variant="ghost" type="button" onClick={() => void deleteTimeline(r.id).then(reload).then(() => onRefresh())}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NotesShelf({ storyId, onRefresh }: { storyId: string; onRefresh: () => Promise<void> | void }) {
  const [rows, setRows] = useState<StoryNote[]>([])
  const latest = useRef(rows)
  latest.current = rows
  const reload = useCallback(async () => setRows(await listNotes(storyId)), [storyId])
  useEffect(() => {
    void reload()
  }, [reload])
  const now = Date.now

  const add = async () => {
    const order = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.order)) + 1
    await upsertNote({
      id: newId(),
      storyId,
      title: 'Note',
      content: '',
      order,
      updatedAt: now(),
    })
    await reload()
    await onRefresh()
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" variant="secondary" type="button" onClick={() => void add()}>
        Add note
      </Button>
      {rows.length === 0 ? <p className="text-sm text-[var(--wn-muted)]">No story notes yet.</p> : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-[var(--wn-border)] p-2">
            <Input
              value={r.title}
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertNote({ ...cur, updatedAt: now() })
                await onRefresh()
              }}
            />
            <Textarea
              className="mt-2 min-h-[90px] text-xs"
              value={r.content}
              onChange={(e) => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, content: e.target.value } : x)))}
              onBlur={async () => {
                const cur = latest.current.find((x) => x.id === r.id)
                if (cur) await upsertNote({ ...cur, updatedAt: now() })
                await onRefresh()
              }}
            />
            <Button className="mt-2 !px-2 !py-1 text-xs" variant="ghost" type="button" onClick={() => void deleteNote(r.id).then(reload).then(() => onRefresh())}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
