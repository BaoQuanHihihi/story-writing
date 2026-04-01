import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BRAND } from '../branding'
import { db } from '../db/database'
import { addChapter, reorderChapters, renameChapter, softDeleteChapter } from '../db/chapterService'
import { exportStory } from '../db/backup'
import { listCharacters, listTimeline } from '../db/extras'
import { touchStoryOpened, updateStoryMeta } from '../db/storyService'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import { saveContinuePointer } from '../settings/storage'
import type { Chapter, Character, Story, TimelineEvent } from '../types'
import { LeftSidebar, type ShelfSection } from '../components/workspace/LeftSidebar'
import { EditorPane, type EditorPaneHandle } from '../components/workspace/EditorPane'
import { RightPanel, type RightTab } from '../components/workspace/RightPanel'
import { SearchChaptersModal } from '../components/workspace/SearchChaptersModal'
import { SettingsModal } from '../components/settings/SettingsModal'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
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

export function WorkspacePage() {
  const { storyId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [story, setStory] = useState<Story | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [trash, setTrash] = useState<Chapter[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])

  const [section, setSection] = useState<ShelfSection>('chapters')
  const [rightTab, setRightTab] = useState<RightTab>('notes')
  const [focusMode, setFocusMode] = useState(false)
  const [mobileShelf, setMobileShelf] = useState(false)
  const [mobileRight, setMobileRight] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [trashChapterConfirm, setTrashChapterConfirm] = useState<{ id: string; title: string } | null>(null)

  const chapterIdParam = searchParams.get('chapter')
  const activeChapterId = chapterIdParam ?? chapters[0]?.id ?? null
  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null

  const editorRef = useRef<EditorPaneHandle>(null)

  const reload = useCallback(async () => {
    if (!storyId) return
    const [s, chs, chars, evs] = await Promise.all([
      db.stories.get(storyId),
      db.chapters.where('storyId').equals(storyId).toArray(),
      listCharacters(storyId),
      listTimeline(storyId),
    ])
    setStory(s ?? null)
    const active = chs.filter((c) => !c.deletedAt).sort((a, b) => a.order - b.order)
    const tr = chs.filter((c) => c.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
    setChapters(active)
    setTrash(tr)
    setCharacters(chars)
    setTimeline(evs)
    setReady(true)
  }, [storyId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!storyId || !activeChapterId) return
    void touchStoryOpened(storyId, activeChapterId)
    saveContinuePointer({ storyId, chapterId: activeChapterId })
  }, [storyId, activeChapterId])

  useEffect(() => {
    if (!chapterIdParam && chapters[0]?.id) {
      setSearchParams({ chapter: chapters[0].id }, { replace: true })
    }
  }, [chapterIdParam, chapters, setSearchParams])

  const selectChapter = useCallback(
    async (id: string) => {
      await editorRef.current?.saveNow()
      setSearchParams({ chapter: id })
      setMobileShelf(false)
    },
    [setSearchParams],
  )

  const persistStoryTitle = useDebouncedCallback((title: string) => {
    if (!storyId) return
    void updateStoryMeta(storyId, { title }).then(reload)
  }, 500)

  const persistChapterTitle = useDebouncedCallback((id: string, title: string) => {
    void renameChapter(id, title).then(reload)
  }, 400)

  const totalStoryWords = useMemo(() => chapters.reduce((a, c) => a + c.wordCount, 0), [chapters])

  const onReorder = async (ids: string[]) => {
    await reorderChapters(storyId, ids)
    await reload()
  }

  const onAddChapter = useCallback(async () => {
    const ch = await addChapter(storyId, `Chương ${chapters.length + 1}`)
    await reload()
    await selectChapter(ch.id)
    setSection('chapters')
  }, [chapters.length, reload, selectChapter, storyId])

  const onTrashChapter = (id: string) => {
    const ch = chapters.find((c) => c.id === id)
    setTrashChapterConfirm({ id, title: ch?.title?.trim() || 'Chương này' })
  }

  const confirmTrashChapter = async () => {
    if (!trashChapterConfirm) return
    const { id } = trashChapterConfirm
    setTrashChapterConfirm(null)
    await editorRef.current?.saveNow()
    const next = chapters.filter((c) => c.id !== id).sort((a, b) => a.order - b.order)[0]
    await softDeleteChapter(id)
    await reload()
    if (next) await selectChapter(next.id)
    else setSearchParams({}, { replace: true })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        void onAddChapter()
      }
      if (mod && e.key === '.') {
        e.preventDefault()
        setFocusMode((f) => !f)
      }
      if (mod && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setHelpOpen((h) => !h)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAddChapter])

  if (!storyId) {
    return null
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-sm text-[var(--wn-muted)]">
        <p>Đang mở truyện…</p>
        <Link className="text-[var(--wn-accent)] underline" to="/">
          Về thư viện
        </Link>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-sm text-[var(--wn-muted)]">
        <p>Không tìm thấy truyện đó trên thiết bị của bạn.</p>
        <Link className="text-[var(--wn-accent)] underline" to="/">
          Về thư viện
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--wn-bg)] text-[var(--wn-text)]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--wn-border)] bg-[var(--wn-surface)] px-3 py-2 sm:px-4">
        <Link to="/" className="rounded-lg px-2 py-1 text-sm font-medium text-[var(--wn-muted)] hover:bg-[var(--wn-surface-2)]">
          ← Thư viện
        </Link>
        <span className="hidden text-[var(--wn-border)] sm:inline">|</span>
        <span className="hidden text-xs text-[var(--wn-muted)] sm:inline">
          {BRAND.name} · <span className="text-[var(--wn-text)]">{story.title}</span>
        </span>
        <span className="ml-auto hidden text-[11px] text-[var(--wn-muted)] lg:inline">Lưu cục bộ trên thiết bị</span>
        <Button variant="ghost" className="!px-2 !py-1 text-xs lg:hidden" type="button" onClick={() => setMobileShelf(true)}>
          Kệ
        </Button>
        <Button variant="ghost" className="!px-2 !py-1 text-xs lg:hidden" type="button" onClick={() => setMobileRight(true)}>
          Công cụ
        </Button>
        <Button
          variant="secondary"
          className="!px-2 !py-1 text-xs"
          type="button"
          onClick={async () => {
            const data = await exportStory(story.id)
            if (data) downloadJson(`${story.title}-writenest.json`, data)
          }}
        >
          Xuất
        </Button>
        <Button variant="ghost" className="!px-2 !py-1 text-xs" type="button" onClick={() => setSettingsOpen(true)}>
          Cài đặt
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className={cn('flex min-h-0 flex-1 lg:contents')}>
          {!focusMode ? (
            <LeftSidebar
              story={story}
              chapters={chapters}
              trashChapters={trash}
              activeChapterId={activeChapterId}
              section={section}
              onSection={setSection}
              onSelectChapter={selectChapter}
              onAddChapter={onAddChapter}
              onReorder={onReorder}
              onTrashChapter={onTrashChapter}
              onRefresh={reload}
              mobileOpen={mobileShelf}
              onCloseMobile={() => setMobileShelf(false)}
            />
          ) : null}

          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {activeChapter ? (
              <EditorPane
                key={activeChapter.id}
                ref={editorRef}
                story={story}
                chapter={activeChapter}
                focusMode={focusMode}
                onToggleFocus={() => setFocusMode((f) => !f)}
                onStoryTitleChange={(title) => {
                  setStory({ ...story, title })
                  persistStoryTitle(title)
                }}
                onChapterTitleChange={(title) => {
                  setChapters((prev) => prev.map((c) => (c.id === activeChapter.id ? { ...c, title } : c)))
                  persistChapterTitle(activeChapter.id, title)
                }}
                totalStoryWords={totalStoryWords}
                onExportMd={() => {
                  const body = editorRef.current?.getCurrentContent() ?? activeChapter.content
                  const blob = new Blob([`# ${activeChapter.title}\n\n${body}`], { type: 'text/markdown' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${activeChapter.title}.md`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--wn-muted)]">
                Truyện này chưa có chương nào.
              </div>
            )}
          </main>

          <div
            className={cn(
              'fixed inset-y-0 right-0 z-30 w-[min(100%,22rem)] translate-x-full border-l border-[var(--wn-border)] transition-transform lg:static lg:z-0 lg:flex lg:w-80 lg:translate-x-0',
              mobileRight && 'translate-x-0',
              focusMode && 'hidden',
            )}
          >
            {activeChapter ? (
              <RightPanel
                tab={rightTab}
                onTab={setRightTab}
                chapter={activeChapter}
                characters={characters}
                timeline={timeline}
                onRefreshSnapshots={reload}
              />
            ) : null}
          </div>
        </div>
      </div>

      {mobileRight ? (
        <button type="button" aria-label="Đóng công cụ" className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setMobileRight(false)} />
      ) : null}

      <SearchChaptersModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        chapters={chapters}
        onPick={(id) => void selectChapter(id)}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ConfirmDialog
        open={!!trashChapterConfirm}
        title="Chuyển vào thùng rác?"
        message={`Chương «${trashChapterConfirm?.title ?? ''}» sẽ được lưu (nếu có thay đổi) rồi chuyển vào thùng rác. Sau này bạn có thể khôi phục từ kệ bên trái.`}
        cancelLabel="Giữ lại"
        confirmLabel="Chuyển vào thùng rác"
        variant="danger"
        onCancel={() => setTrashChapterConfirm(null)}
        onConfirm={() => void confirmTrashChapter()}
      />

      {helpOpen ? (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border border-[var(--wn-border)] bg-[var(--wn-surface)] p-4 text-xs shadow-lg">
          <p className="font-semibold text-[var(--wn-text)]">Phím tắt</p>
          <ul className="mt-2 space-y-1 text-[var(--wn-muted)]">
            <li>
              <kbd className="rounded bg-[var(--wn-surface-2)] px-1">⌘/Ctrl K</kbd> Tìm chương
            </li>
            <li>
              <kbd className="rounded bg-[var(--wn-surface-2)] px-1">⌘/Ctrl ⇧ N</kbd> Chương mới
            </li>
            <li>
              <kbd className="rounded bg-[var(--wn-surface-2)] px-1">⌘/Ctrl .</kbd> Chế độ tập trung
            </li>
            <li>
              <kbd className="rounded bg-[var(--wn-surface-2)] px-1">?</kbd> Bật/tắt bảng này
            </li>
          </ul>
          <button type="button" className="mt-3 text-[var(--wn-accent)] underline" onClick={() => setHelpOpen(false)}>
            Đóng
          </button>
        </div>
      ) : null}
    </div>
  )
}
