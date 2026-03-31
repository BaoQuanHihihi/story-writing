import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Chapter, ChapterStatus } from '../../types'
import { countWords } from '../../lib/words'
import { cn } from '../../lib/cn'

const chStatusLabel: Record<ChapterStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  complete: 'Complete',
  needs_revision: 'Needs revision',
}

function ChapterRow({
  chapter,
  active,
  onSelect,
  onTrash,
}: {
  chapter: Chapter
  active: boolean
  onSelect: () => void
  onTrash?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: chapter.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const wc = chapter.wordCount || countWords(chapter.content)

  return (
    <div ref={setNodeRef} style={style} className={cn('rounded-xl border bg-[var(--wn-surface)]', active ? 'border-[var(--wn-accent)] shadow-sm' : 'border-[var(--wn-border)]')}>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          className="cursor-grab px-1.5 text-[var(--wn-muted)] touch-none hover:text-[var(--wn-text)]"
          aria-label={`Reorder ${chapter.title}`}
          {...attributes}
          {...listeners}
        >
          ⣿
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 px-2 py-2 text-left"
          onClick={onSelect}
        >
          <p className="truncate text-sm font-medium text-[var(--wn-text)]">{chapter.title}</p>
          <p className="mt-0.5 text-[11px] text-[var(--wn-muted)]">
            {wc.toLocaleString()} w · {chStatusLabel[chapter.status]}
          </p>
        </button>
        {onTrash ? (
          <button
            type="button"
            className="px-2 text-[var(--wn-muted)] hover:text-red-600"
            aria-label={`Move ${chapter.title} to trash`}
            onClick={(e) => {
              e.stopPropagation()
              onTrash()
            }}
          >
            🗑
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function ChapterList({
  chapters,
  activeId,
  onSelect,
  onReorder,
  onTrashChapter,
}: {
  chapters: Chapter[]
  activeId: string | null
  onSelect: (id: string) => void
  onReorder: (orderedIds: string[]) => void
  onTrashChapter?: (id: string) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = chapters.map((c) => c.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {chapters.map((c) => (
            <ChapterRow
              key={c.id}
              chapter={c}
              active={c.id === activeId}
              onSelect={() => onSelect(c.id)}
              onTrash={onTrashChapter ? () => onTrashChapter(c.id) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
