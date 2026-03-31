import type { Table } from 'dexie'
import type { BackupPayload } from '../types'
import { SCHEMA_VERSION } from './database'
import { db } from './database'

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function isStoryStatus(x: unknown): boolean {
  return x === 'draft' || x === 'ongoing' || x === 'completed' || x === 'paused'
}

function isChapterStatus(x: unknown): boolean {
  return (
    x === 'draft' ||
    x === 'in_progress' ||
    x === 'complete' ||
    x === 'needs_revision'
  )
}

function isSnapshotType(x: unknown): boolean {
  return x === 'autosave' || x === 'manual' || x === 'checkpoint'
}

export function validateBackup(input: unknown): { ok: true; data: BackupPayload } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: 'Backup must be a JSON object.' }
  const schemaVersion = input.schemaVersion
  if (typeof schemaVersion !== 'number' || schemaVersion < 1) {
    return { ok: false, error: 'Missing or invalid schemaVersion.' }
  }
  const exportedAt = input.exportedAt
  if (typeof exportedAt !== 'string') return { ok: false, error: 'Missing exportedAt.' }

  const arrays: (keyof BackupPayload)[] = [
    'stories',
    'chapters',
    'characters',
    'outlineItems',
    'timelineEvents',
    'storyNotes',
    'worldEntries',
    'snapshots',
  ]
  for (const key of arrays) {
    if (!Array.isArray(input[key])) return { ok: false, error: `Missing array: ${key}` }
  }

  for (const s of input.stories as unknown[]) {
    if (!isRecord(s)) return { ok: false, error: 'Invalid story entry.' }
    if (typeof s.id !== 'string' || typeof s.title !== 'string') return { ok: false, error: 'Invalid story shape.' }
    if (!isStoryStatus(s.status)) return { ok: false, error: 'Invalid story status.' }
  }
  for (const c of input.chapters as unknown[]) {
    if (!isRecord(c)) return { ok: false, error: 'Invalid chapter entry.' }
    if (typeof c.id !== 'string' || typeof c.storyId !== 'string' || typeof c.title !== 'string') {
      return { ok: false, error: 'Invalid chapter shape.' }
    }
    if (!isChapterStatus(c.status)) return { ok: false, error: 'Invalid chapter status.' }
    if (typeof c.order !== 'number') return { ok: false, error: 'Invalid chapter order.' }
  }
  for (const sn of input.snapshots as unknown[]) {
    if (!isRecord(sn)) return { ok: false, error: 'Invalid snapshot entry.' }
    if (!isSnapshotType(sn.type)) return { ok: false, error: 'Invalid snapshot type.' }
  }

  return {
    ok: true,
    data: input as unknown as BackupPayload,
  }
}

export async function exportAllStories(): Promise<BackupPayload> {
  const [
    stories,
    chapters,
    characters,
    outlineItems,
    timelineEvents,
    storyNotes,
    worldEntries,
    snapshots,
  ] = await Promise.all([
    db.stories.toArray(),
    db.chapters.toArray(),
    db.characters.toArray(),
    db.outlineItems.toArray(),
    db.timelineEvents.toArray(),
    db.storyNotes.toArray(),
    db.worldEntries.toArray(),
    db.snapshots.toArray(),
  ])
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    stories,
    chapters,
    characters,
    outlineItems,
    timelineEvents,
    storyNotes,
    worldEntries,
    snapshots,
  }
}

export async function exportStory(storyId: string): Promise<BackupPayload | null> {
  const story = await db.stories.get(storyId)
  if (!story) return null
  const [
    chapters,
    characters,
    outlineItems,
    timelineEvents,
    storyNotes,
    worldEntries,
    snapshots,
  ] = await Promise.all([
    db.chapters.where('storyId').equals(storyId).toArray(),
    db.characters.where('storyId').equals(storyId).toArray(),
    db.outlineItems.where('storyId').equals(storyId).toArray(),
    db.timelineEvents.where('storyId').equals(storyId).toArray(),
    db.storyNotes.where('storyId').equals(storyId).toArray(),
    db.worldEntries.where('storyId').equals(storyId).toArray(),
    db.snapshots.where('storyId').equals(storyId).toArray(),
  ])
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    stories: [story],
    chapters,
    characters,
    outlineItems,
    timelineEvents,
    storyNotes,
    worldEntries,
    snapshots,
  }
}

export type MergeStrategy = 'skip' | 'overwrite'

export async function importBackup(data: BackupPayload, strategy: MergeStrategy): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0

  await db.transaction(
    'rw',
    [
      db.stories,
      db.chapters,
      db.characters,
      db.outlineItems,
      db.timelineEvents,
      db.storyNotes,
      db.worldEntries,
      db.snapshots,
    ],
    async () => {
      const putOrSkip = async <T extends { id: string }>(table: Table<T, string>, row: T) => {
        const existing = await table.get(row.id)
        if (existing && strategy === 'skip') {
          skipped += 1
          return
        }
        await table.put(row)
        imported += 1
      }

      for (const s of data.stories) await putOrSkip(db.stories, s)
      for (const c of data.chapters) await putOrSkip(db.chapters, c)
      for (const c of data.characters) await putOrSkip(db.characters, c)
      for (const o of data.outlineItems) await putOrSkip(db.outlineItems, o)
      for (const t of data.timelineEvents) await putOrSkip(db.timelineEvents, t)
      for (const n of data.storyNotes) await putOrSkip(db.storyNotes, n)
      for (const w of data.worldEntries) await putOrSkip(db.worldEntries, w)
      for (const sn of data.snapshots) await putOrSkip(db.snapshots, sn)
    },
  )

  return { imported, skipped }
}
