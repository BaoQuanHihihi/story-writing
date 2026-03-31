import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BRAND } from '../branding'
import { StoryCard } from '../components/library/StoryCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Modal } from '../components/ui/Modal'
import { SettingsModal } from '../components/settings/SettingsModal'
import { db } from '../db/database'
import {
  createStory,
  deleteStoryCascade,
  duplicateStory,
  getContinueTarget,
  listStoriesWithStats,
  updateStoryMeta,
} from '../db/storyService'
import { exportAllStories, exportStory, importBackup, validateBackup } from '../db/backup'
import type { StoryStatus } from '../types'
import { storyMatchesQuery } from '../lib/search'
import { saveContinuePointer } from '../settings/storage'
import { getOnboardingSeen, setOnboardingSeen } from '../settings/storage'
import { cn } from '../lib/cn'

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function LibraryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Awaited<ReturnType<typeof listStoriesWithStats>>>([])
  const [query, setQuery] = useState('')
  const [continueTarget, setContinueTarget] = useState<{ storyId: string; chapterId: string } | null>(null)
  const [continueStoryTitle, setContinueStoryTitle] = useState<string | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [importConfirm, setImportConfirm] = useState<{ data: import('../types').BackupPayload } | null>(null)

  const importRef = useRef<HTMLInputElement>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => !getOnboardingSeen())
  const refresh = useCallback(async () => {
    const [list, cont] = await Promise.all([listStoriesWithStats(), getContinueTarget()])
    setItems(list)
    setContinueTarget(cont)
    if (cont) {
      const s = await db.stories.get(cont.storyId)
      setContinueStoryTitle(s?.title ?? null)
    } else {
      setContinueStoryTitle(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return items
    return items.filter((it) => storyMatchesQuery(it.story.title, it.story.description, it.story.genre, q))
  }, [items, query])

  return (
    <div className="min-h-dvh pb-16">
      <header className="border-b border-[var(--wn-border)] bg-[var(--wn-surface)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--wn-muted)]">
                {BRAND.tagline}
              </p>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--wn-text)]">
                {BRAND.name}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[var(--wn-muted)]">
                Dữ liệu được lưu trên thiết bị người dùng. Mở ứng dụng bất cứ lúc nào và viết tiếp câu chuyện của bạn.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
                Settings
              </Button>
              <Button variant="secondary" onClick={() => importRef.current?.click()}>
                Import backup
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    const text = await file.text()
                    const parsed = JSON.parse(text) as unknown
                    const v = validateBackup(parsed)
                    if (!v.ok) {
                      alert(v.error)
                      return
                    }
                    const ids = new Set((await db.stories.toArray()).map((s) => s.id))
                    const hasOverlap = v.data.stories.some((s) => ids.has(s.id))
                    if (hasOverlap) {
                      setImportConfirm({ data: v.data })
                    } else {
                      await importBackup(v.data, 'overwrite')
                      await refresh()
                    }
                  } catch {
                    alert('Could not read backup file.')
                  }
                }}
              />
              <Button onClick={() => setCreateOpen(true)}>New story</Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="story-search">
              Search stories
            </label>
            <Input
              id="story-search"
              placeholder="Tìm kiếm theo tiêu đề, mô tả, thể loại..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-md"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {showOnboarding ? (
          <div className="mb-8 rounded-2xl border border-dashed border-[var(--wn-border)] bg-[var(--wn-accent-soft)] p-4 text-sm text-[var(--wn-text)]">
            <p className="font-medium">Welcome</p>
            <p className="mt-1 text-[var(--wn-muted)]">
              Your manuscripts never leave this browser. Use Export occasionally for peace of mind. In a story,
              press ⌘K / Ctrl+K to search chapters, ⌘⇧N / Ctrl+Shift+N for a new chapter, and ⌘. / Ctrl+. for Focus
              mode.
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-[var(--wn-accent)] underline-offset-2 hover:underline"
              onClick={() => {
                setOnboardingSeen()
                setShowOnboarding(false)
              }}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {continueTarget?.chapterId ? (
          <section className="mb-10 rounded-2xl border border-[var(--wn-border)] bg-[var(--wn-surface)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wn-muted)]">
              Continue writing
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-serif text-xl text-[var(--wn-text)]">{continueStoryTitle ?? 'Your story'}</p>
                <p className="text-sm text-[var(--wn-muted)]">Most recent desk session</p>
              </div>
              <Button
                onClick={() => {
                  saveContinuePointer({
                    storyId: continueTarget.storyId,
                    chapterId: continueTarget.chapterId,
                  })
                  navigate(`/story/${continueTarget.storyId}?chapter=${continueTarget.chapterId}`)
                }}
              >
                Open last chapter
              </Button>
            </div>
          </section>
        ) : null}

        {items.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-[var(--wn-border)] bg-[var(--wn-surface)] px-8 py-14 text-center shadow-[var(--wn-shadow)]">
            <p className="font-serif text-2xl text-[var(--wn-text)]">Your desk is clear</p>
            <p className="mt-3 text-sm text-[var(--wn-muted)]">
              Start a story, or import a backup from another device. Everything stays in this browser until you
              export it.
            </p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              Create your first story
            </Button>
          </div>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--wn-text)]">Library</h2>
              <Button
                variant="ghost"
                className="!px-2 !py-1 text-xs"
                onClick={async () => {
                  const data = await exportAllStories()
                  downloadJson('writenest-backup.json', data)
                }}
              >
                Export all stories
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((it) => (
                <StoryCard
                  key={it.story.id}
                  story={it.story}
                  chapterCount={it.chapterCount}
                  wordCount={it.wordCount}
                  lastEdited={it.lastEdited}
                  onOpen={() => {
                    const ch = it.story.lastChapterId
                    saveContinuePointer({ storyId: it.story.id, chapterId: ch ?? '' })
                    const q = ch ? `?chapter=${encodeURIComponent(ch)}` : ''
                    navigate(`/story/${it.story.id}${q}`)
                  }}
                  onRename={() => setRenameTargetId(it.story.id)}
                  onDuplicate={async () => {
                    await duplicateStory(it.story.id)
                    await refresh()
                  }}
                  onExport={async () => {
                    const data = await exportStory(it.story.id)
                    if (data) downloadJson(`${slugify(it.story.title)}-writenest.json`, data)
                  }}
                  onDelete={() => setDeleteTargetId(it.story.id)}
                />
              ))}
            </div>
            {filtered.length === 0 ? (
              <p className="mt-6 text-center text-sm text-[var(--wn-muted)]">No stories match your search.</p>
            ) : null}
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-[var(--wn-muted)] sm:px-6">
        Autosave and backups keep your work safe on this device.
      </footer>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <CreateStoryModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={refresh} navigate={navigate} />

      <RenameStoryModal
        open={!!renameTargetId}
        storyId={renameTargetId}
        onClose={() => setRenameTargetId(null)}
        onSaved={refresh}
      />

      <DeleteStoryModal
        open={!!deleteTargetId}
        storyId={deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onDeleted={refresh}
      />

      <Modal
        open={!!importConfirm}
        title="Import backup"
        ariaDescription="Some stories in this file already exist. Choose how to merge."
        onClose={() => setImportConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!importConfirm) return
                await importBackup(importConfirm.data, 'skip')
                setImportConfirm(null)
                await refresh()
              }}
            >
              Skip duplicates
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!importConfirm) return
                if (!confirm('Overwrite existing entries with the same IDs?')) return
                await importBackup(importConfirm.data, 'overwrite')
                setImportConfirm(null)
                await refresh()
              }}
            >
              Overwrite duplicates
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--wn-muted)]">
          This backup contains stories that share IDs with work already in your library. You can skip importing
          those entries, or overwrite them with the backup version.
        </p>
      </Modal>
    </div>
  )
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'story'
}

function CreateStoryModal({
  open,
  onClose,
  onCreated,
  navigate,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => Promise<void>
  navigate: (path: string) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('General')
  const [status, setStatus] = useState<StoryStatus>('draft')
  const [cover, setCover] = useState<string | null>('#b45309')

  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setGenre('General')
      setStatus('draft')
      setCover('#b45309')
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New story"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const { story, chapter } = await createStory({
                title: title || 'Untitled story',
                description,
                genre,
                status,
                coverColor: cover,
              })
              await onCreated()
              onClose()
              navigate(`/story/${story.id}?chapter=${chapter.id}`)
            }}
          >
            Create & open
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Working title" />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A single calm line about what this is." />
        </Field>
        <Field label="Genre / shelf">
          <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
        </Field>
        <Field label="Status">
          <select
            className="w-full rounded-xl border border-[var(--wn-border)] bg-[var(--wn-surface)] px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as StoryStatus)}
          >
            <option value="draft">Draft</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>
        </Field>
        <Field label="Accent">
          <div className="flex flex-wrap gap-2">
            {['#b45309', '#0f766e', '#4338ca', '#be123c', '#57534e'].map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Accent color ${c}`}
                className={cn(
                  'h-8 w-8 rounded-full border-2 border-transparent shadow-sm',
                  cover === c && 'ring-2 ring-[var(--wn-accent)] ring-offset-2 ring-offset-[var(--wn-surface)]',
                )}
                style={{ backgroundColor: c }}
                onClick={() => setCover(c)}
              />
            ))}
            <button type="button" className="text-xs text-[var(--wn-muted)] underline" onClick={() => setCover(null)}>
              None
            </button>
          </div>
        </Field>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--wn-muted)]">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function RenameStoryModal({
  open,
  storyId,
  onClose,
  onSaved,
}: {
  open: boolean
  storyId: string | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [title, setTitle] = useState('')
  useEffect(() => {
    if (!open || !storyId) return
    void (async () => {
      const s = await db.stories.get(storyId)
      setTitle(s?.title ?? '')
    })()
  }, [open, storyId])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rename story"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (storyId) await updateStoryMeta(storyId, { title })
              await onSaved()
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
    </Modal>
  )
}

function DeleteStoryModal({
  open,
  storyId,
  onClose,
  onDeleted,
}: {
  open: boolean
  storyId: string | null
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const [title, setTitle] = useState<string | null>(null)
  useEffect(() => {
    if (!open || !storyId) return
    void (async () => {
      const s = await db.stories.get(storyId)
      setTitle(s?.title ?? null)
    })()
  }, [open, storyId])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete story?"
      ariaDescription={`This removes “${title ?? 'this story'}” and all chapters from this device.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (storyId) await deleteStoryCascade(storyId)
              await onDeleted()
              onClose()
            }}
          >
            Delete forever
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--wn-muted)]">
        Export first if you might need a copy. This cannot be undone here.
      </p>
    </Modal>
  )
}
