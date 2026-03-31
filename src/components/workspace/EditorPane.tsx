import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Chapter, Story } from '../../types'
import { countWords, readingMinutes } from '../../lib/words'
import { formatSaveAge } from '../../lib/formatTime'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'
import { addSnapshot, saveChapterContent } from '../../db/chapterService'
import { useSettings } from '../../context/SettingsContext'
import { bumpDailyWords, getDailyWordsRecord } from '../../settings/storage'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

export type EditorPaneHandle = {
  saveNow: () => Promise<void>
  getCurrentContent: () => string
}

function insertAroundSelection(textarea: HTMLTextAreaElement, before: string, after: string) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end)
  const next = value.slice(0, start) + before + selected + after + value.slice(end)
  const cursor = start + before.length + selected.length + after.length
  return { next, cursor }
}

export const EditorPane = forwardRef<
  EditorPaneHandle,
  {
    story: Story
    chapter: Chapter
    focusMode: boolean
    onToggleFocus: () => void
    onChapterTitleChange: (title: string) => void
    onStoryTitleChange: (title: string) => void
    totalStoryWords: number
    onExportMd: () => void
  }
>(function EditorPane(
  { story, chapter, focusMode, onToggleFocus, onChapterTitleChange, onStoryTitleChange, totalStoryWords, onExportMd },
  ref,
) {
  const { settings } = useSettings()
  const [content, setContent] = useState(chapter.content)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('saved')
  const [lastSaveAt, setLastSaveAt] = useState<number | null>(chapter.updatedAt)
  const lastWordCountRef = useRef(chapter.wordCount)
  const lastSnapRef = useRef<{ at: number; content: string }>({ at: 0, content: chapter.content })
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setContent(chapter.content)
    lastWordCountRef.current = chapter.wordCount
    lastSnapRef.current = { at: Date.now(), content: chapter.content }
    setLastSaveAt(chapter.updatedAt)
    setSaveState('saved')
  }, [chapter.id, chapter.content, chapter.updatedAt, chapter.wordCount])

  const wc = useMemo(() => countWords(content), [content])
  const readMin = readingMinutes(wc)

  const runSave = useCallback(
    async (contentToSave: string) => {
      setSaveState('saving')
      const beforeW = lastWordCountRef.current
      await saveChapterContent(chapter.id, contentToSave)
      const nextW = countWords(contentToSave)
      const delta = Math.max(0, nextW - beforeW)
      if (delta > 0) bumpDailyWords(delta)
      lastWordCountRef.current = nextW
      const now = Date.now()
      setLastSaveAt(now)
      setSaveState('saved')

      const due = now - lastSnapRef.current.at >= settings.periodicSnapshotMs
      const changed = lastSnapRef.current.content !== contentToSave
      if (due && changed) {
        await addSnapshot(story.id, chapter.id, contentToSave, 'autosave', false)
        lastSnapRef.current = { at: now, content: contentToSave }
      }
    },
    [chapter.id, settings.periodicSnapshotMs, story.id],
  )

  const debouncedSave = useDebouncedCallback(runSave, settings.autosaveDebounceMs)

  useEffect(() => {
    const flush = () => {
      void runSave(content)
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('beforeunload', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('beforeunload', flush)
    }
  }, [content, runSave])

  const saveNow = useCallback(async () => {
    await runSave(content)
  }, [content, runSave])

  useImperativeHandle(
    ref,
    () => ({
      saveNow,
      getCurrentContent: () => content,
    }),
    [content, saveNow],
  )

  const maxW =
    settings.editorMaxWidth === 'narrow'
      ? '42rem'
      : settings.editorMaxWidth === 'wide'
        ? '64rem'
        : '52rem'

  const wrapSelection = (before: string, after: string) => {
    const ta = taRef.current
    if (!ta) return
    const { next, cursor } = insertAroundSelection(ta, before, after)
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(cursor, cursor)
    })
    debouncedSave(next)
  }

  const dailyGoal = settings.dailyWordGoal
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayProgress = getDailyWordsRecord()[todayKey] ?? 0

  const insertLinePrefix = useCallback(
    (prefix: string) => {
      const ta = taRef.current
      if (!ta) return
      const start = ta.selectionStart
      const value = ta.value
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
      setContent(next)
      debouncedSave(next)
      requestAnimationFrame(() => {
        ta.focus()
        const pos = start + prefix.length
        ta.setSelectionRange(pos, pos)
      })
    },
    [debouncedSave],
  )

  const insertSceneBreak = useCallback(() => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const value = ta.value
    const insert = '\n\n* * *\n\n'
    const next = value.slice(0, start) + insert + value.slice(start)
    setContent(next)
    debouncedSave(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + insert.length
      ta.setSelectionRange(pos, pos)
    })
  }, [debouncedSave])

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', focusMode && 'bg-[var(--wn-bg)]')}>
      <header className="shrink-0 border-b border-[var(--wn-border)] bg-[var(--wn-surface)]/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[var(--wn-edit-max)] flex-col gap-3" style={{ ['--wn-edit-max' as string]: maxW }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <label className="sr-only" htmlFor="story-title-input">
                Tiêu đề truyện
              </label>
              <input
                id="story-title-input"
                className="w-full truncate bg-transparent font-serif text-2xl font-semibold text-[var(--wn-text)] outline-none focus:underline decoration-dotted"
                value={story.title}
                onChange={(e) => onStoryTitleChange(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-[var(--wn-muted)]">Chương</span>
                <input
                  aria-label="Tiêu đề chương"
                  className="min-w-[10rem] flex-1 rounded-lg border border-transparent bg-[var(--wn-surface-2)] px-2 py-1 text-sm text-[var(--wn-text)] outline-none focus:border-[var(--wn-border)]"
                  value={chapter.title}
                  onChange={(e) => onChapterTitleChange(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--wn-muted)]" aria-live="polite">
                {saveState === 'saving' ? 'Đang lưu…' : formatSaveAge(lastSaveAt)}
              </span>
              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" type="button" onClick={onExportMd}>
                Xuất .md
              </Button>
              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" type="button" onClick={onToggleFocus}>
                {focusMode ? 'Thoát tập trung' : 'Tập trung'}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--wn-muted)]">
            <span>
              Chương: <strong className="text-[var(--wn-text)] tabular-nums">{wc}</strong> chữ
            </span>
            <span>
              Truyện: <strong className="text-[var(--wn-text)] tabular-nums">{totalStoryWords}</strong> chữ
            </span>
            <span>
              Đọc ~<strong className="text-[var(--wn-text)] tabular-nums">{readMin}</strong> phút
            </span>
            {dailyGoal > 0 ? (
              <span>
                Hôm nay:{' '}
                <strong className="text-[var(--wn-text)] tabular-nums">{todayProgress}</strong> /{' '}
                <span className="tabular-nums">{dailyGoal}</span> chữ
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full min-h-0 flex-1 flex-col" style={{ maxWidth: maxW }}>
          <div className="mb-2 flex flex-wrap gap-2">
            <FormatBtn label="Đậm" onClick={() => wrapSelection('**', '**')} />
            <FormatBtn label="Nghiêng" onClick={() => wrapSelection('*', '*')} />
            <FormatBtn label="Tiêu đề" onClick={() => insertLinePrefix('## ')} />
            <FormatBtn label="Ngắt cảnh" onClick={insertSceneBreak} />
          </div>
          <textarea
            ref={taRef}
            className="prose-editor min-h-[50dvh] w-full flex-1 resize-none rounded-2xl border border-[var(--wn-border)] bg-[var(--wn-surface)] p-4 sm:p-6 text-[length:var(--fs)] leading-relaxed text-[var(--wn-text)] outline-none focus:ring-2 focus:ring-[var(--wn-accent)]/25"
            style={{ ['--fs' as string]: `${settings.fontSize}px` }}
            placeholder="Viết thong thả cũng được — bản nháp sẽ được lưu tự động."
            value={content}
            spellCheck
            onChange={(e) => {
              const v = e.target.value
              setContent(v)
              setSaveState('idle')
              debouncedSave(v)
            }}
          />
        </div>
      </div>
    </div>
  )
})

EditorPane.displayName = 'EditorPane'

function FormatBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[var(--wn-border)] bg-[var(--wn-surface)] px-2 py-1 text-xs text-[var(--wn-text)] hover:bg-[var(--wn-surface-2)]"
    >
      {label}
    </button>
  )
}
