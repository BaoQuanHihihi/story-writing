import { nanoid } from 'nanoid'
import type { Chapter, ChapterStatus, Snapshot, SnapshotType } from '../types'
import { countWords } from '../lib/words'
import { db } from './database'

export async function saveChapterContent(
  chapterId: string,
  content: string,
  extra?: Partial<Pick<Chapter, 'title' | 'notes' | 'status'>>,
): Promise<Chapter | undefined> {
  const ch = await db.chapters.get(chapterId)
  if (!ch || ch.deletedAt) return undefined
  const now = Date.now()
  const wordCount = countWords(content)
  const patch: Partial<Chapter> = {
    content,
    wordCount,
    updatedAt: now,
    ...extra,
  }
  await db.chapters.update(chapterId, patch)
  await db.stories.update(ch.storyId, { updatedAt: now })
  return { ...ch, ...patch }
}

export async function reorderChapters(storyId: string, orderedIds: string[]) {
  const now = Date.now()
  await db.transaction('rw', [db.chapters, db.stories], async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.chapters.update(orderedIds[i], { order: i, updatedAt: now })
    }
    await db.stories.update(storyId, { updatedAt: now })
  })
}

export async function addChapter(storyId: string, title: string): Promise<Chapter> {
  const now = Date.now()
  const existing = await db.chapters.where('storyId').equals(storyId).filter((c) => !c.deletedAt).toArray()
  const maxOrder = existing.reduce((m, c) => Math.max(m, c.order), -1)
  const content = ''
  const ch: Chapter = {
    id: nanoid(),
    storyId,
    title: title.trim() || `Chương ${existing.length + 1}`,
    content,
    order: maxOrder + 1,
    status: 'draft',
    wordCount: 0,
    updatedAt: now,
    notes: '',
    deletedAt: null,
  }
  await db.transaction('rw', [db.chapters, db.stories], async () => {
    await db.chapters.add(ch)
    await db.stories.update(storyId, { updatedAt: now, lastChapterId: ch.id })
  })
  return ch
}

export async function renameChapter(chapterId: string, title: string) {
  const now = Date.now()
  const ch = await db.chapters.get(chapterId)
  if (!ch) return
  await db.chapters.update(chapterId, { title: title.trim() || 'Chương chưa đặt tên', updatedAt: now })
  await db.stories.update(ch.storyId, { updatedAt: now })
}

export async function setChapterStatus(chapterId: string, status: ChapterStatus) {
  const now = Date.now()
  const ch = await db.chapters.get(chapterId)
  if (!ch) return
  await db.chapters.update(chapterId, { status, updatedAt: now })
  await db.stories.update(ch.storyId, { updatedAt: now })
}

export async function softDeleteChapter(chapterId: string) {
  const now = Date.now()
  const ch = await db.chapters.get(chapterId)
  if (!ch) return
  await db.chapters.update(chapterId, { deletedAt: now, updatedAt: now })
  await db.stories.update(ch.storyId, { updatedAt: now })
}

export async function restoreChapter(chapterId: string) {
  const now = Date.now()
  const ch = await db.chapters.get(chapterId)
  if (!ch) return
  await db.chapters.update(chapterId, { deletedAt: null, updatedAt: now })
  await db.stories.update(ch.storyId, { updatedAt: now })
}

export async function permanentlyDeleteChapter(chapterId: string) {
  const ch = await db.chapters.get(chapterId)
  if (!ch) return
  await db.transaction('rw', [db.chapters, db.snapshots], async () => {
    await db.snapshots.where('chapterId').equals(chapterId).delete()
    await db.chapters.delete(chapterId)
  })
  await db.stories.update(ch.storyId, { updatedAt: Date.now() })
}

export async function addSnapshot(
  storyId: string,
  chapterId: string,
  content: string,
  type: SnapshotType,
  pinned = false,
): Promise<Snapshot> {
  const snap: Snapshot = {
    id: nanoid(),
    storyId,
    chapterId,
    content,
    createdAt: Date.now(),
    type,
    pinned,
  }
  await db.snapshots.add(snap)
  return snap
}

export async function listSnapshotsForChapter(chapterId: string) {
  const rows = await db.snapshots.where('chapterId').equals(chapterId).toArray()
  rows.sort((a, b) => b.createdAt - a.createdAt)
  return rows
}

export async function setSnapshotPinned(snapshotId: string, pinned: boolean) {
  await db.snapshots.update(snapshotId, { pinned })
}

export async function deleteSnapshot(snapshotId: string) {
  await db.snapshots.delete(snapshotId)
}
