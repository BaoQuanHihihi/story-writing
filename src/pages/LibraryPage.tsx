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
              <Button variant="secondary" onClick={() => setSettingsOpen(true)} aria-label="Mở cài đặt">
                Cài đặt
              </Button>
              <Button variant="secondary" onClick={() => importRef.current?.click()}>
                Nhập sao lưu
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
                    alert('Không đọc được file sao lưu.')
                  }
                }}
              />
              <Button onClick={() => setCreateOpen(true)}>Truyện mới</Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="story-search">
              Tìm truyện
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
            <p className="font-medium">Chào bạn</p>
            <p className="mt-1 text-[var(--wn-muted)]">
              Bản thảo chỉ nằm trên trình duyệt này. Thỉnh thoảng hãy xuất sao lưu cho yên tâm. Trong truyện: ⌘K / Ctrl+K
              để tìm chương, ⌘⇧N / Ctrl+Shift+N thêm chương mới, ⌘. / Ctrl+. chế độ tập trung.
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-[var(--wn-accent)] underline-offset-2 hover:underline"
              onClick={() => {
                setOnboardingSeen()
                setShowOnboarding(false)
              }}
            >
              Ẩn
            </button>
          </div>
        ) : null}

        {continueTarget?.chapterId ? (
          <section className="mb-10 rounded-2xl border border-[var(--wn-border)] bg-[var(--wn-surface)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wn-muted)]">
              Viết tiếp
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-serif text-xl text-[var(--wn-text)]">{continueStoryTitle ?? 'Truyện của bạn'}</p>
                <p className="text-sm text-[var(--wn-muted)]">Phiên làm việc gần nhất</p>
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
                Mở chương trước
              </Button>
            </div>
          </section>
        ) : null}

        {items.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-[var(--wn-border)] bg-[var(--wn-surface)] px-8 py-14 text-center shadow-[var(--wn-shadow)]">
            <p className="font-serif text-2xl text-[var(--wn-text)]">Bàn viết đang trống</p>
            <p className="mt-3 text-sm text-[var(--wn-muted)]">
              Tạo truyện mới hoặc nhập sao lưu từ thiết bị khác. Mọi thứ chỉ ở trên trình duyệt này cho đến khi bạn
              xuất ra ngoài.
            </p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              Tạo truyện đầu tiên
            </Button>
          </div>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--wn-text)]">Thư viện</h2>
              <Button
                variant="ghost"
                className="!px-2 !py-1 text-xs"
                onClick={async () => {
                  const data = await exportAllStories()
                  downloadJson('sao-luu-writenest.json', data)
                }}
              >
                Xuất tất cả truyện
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
              <p className="mt-6 text-center text-sm text-[var(--wn-muted)]">Không có truyện khớp tìm kiếm.</p>
            ) : null}
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-[var(--wn-muted)] sm:px-6">
        Tự động lưu và sao lưu giữ bản thảo an toàn trên thiết bị này.
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
        title="Nhập sao lưu"
        ariaDescription="Một số truyện trong file đã tồn tại. Chọn cách gộp dữ liệu."
        onClose={() => setImportConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportConfirm(null)}>
              Hủy
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
              Bỏ qua trùng ID
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!importConfirm) return
                if (!confirm('Ghi đè các mục đã có cùng ID?')) return
                await importBackup(importConfirm.data, 'overwrite')
                setImportConfirm(null)
                await refresh()
              }}
            >
              Ghi đè trùng ID
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--wn-muted)]">
          File sao lưu chứa truyện trùng ID với thư viện hiện tại. Bạn có thể bỏ qua các mục đó hoặc ghi đè bằng bản
          trong file.
        </p>
      </Modal>
    </div>
  )
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'truyen'
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
  const [genre, setGenre] = useState('Chung')
  const [status, setStatus] = useState<StoryStatus>('draft')
  const [cover, setCover] = useState<string | null>('#b45309')

  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setGenre('Chung')
      setStatus('draft')
      setCover('#b45309')
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Truyện mới"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={async () => {
              const { story, chapter } = await createStory({
                title: title || 'Truyện chưa đặt tên',
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
            Tạo và mở
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Tiêu đề">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên làm việc" />
        </Field>
        <Field label="Mô tả">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Một dòng giới thiệu ngắn về truyện."
          />
        </Field>
        <Field label="Thể loại / kệ">
          <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
        </Field>
        <Field label="Trạng thái">
          <select
            className="w-full rounded-xl border border-[var(--wn-border)] bg-[var(--wn-surface)] px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as StoryStatus)}
          >
            <option value="draft">Bản nháp</option>
            <option value="ongoing">Đang viết</option>
            <option value="completed">Hoàn thành</option>
            <option value="paused">Tạm dừng</option>
          </select>
        </Field>
        <Field label="Màu nhấn">
          <div className="flex flex-wrap gap-2">
            {['#b45309', '#0f766e', '#4338ca', '#be123c', '#57534e'].map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Màu nhấn ${c}`}
                className={cn(
                  'h-8 w-8 rounded-full border-2 border-transparent shadow-sm',
                  cover === c && 'ring-2 ring-[var(--wn-accent)] ring-offset-2 ring-offset-[var(--wn-surface)]',
                )}
                style={{ backgroundColor: c }}
                onClick={() => setCover(c)}
              />
            ))}
            <button type="button" className="text-xs text-[var(--wn-muted)] underline" onClick={() => setCover(null)}>
              Không
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
      title="Đổi tên truyện"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={async () => {
              if (storyId) await updateStoryMeta(storyId, { title })
              await onSaved()
              onClose()
            }}
          >
            Lưu
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
      title="Xóa truyện?"
      ariaDescription={`Thao tác này xóa «${title ?? 'truyện này'}» và mọi chương khỏi thiết bị.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (storyId) await deleteStoryCascade(storyId)
              await onDeleted()
              onClose()
            }}
          >
            Xóa vĩnh viễn
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--wn-muted)]">
        Hãy xuất sao lưu trước nếu bạn cần bản sao. Thao tác này không thể hoàn tác trên ứng dụng.
      </p>
    </Modal>
  )
}
