import { nanoid } from 'nanoid'
import type { Chapter, Story, StoryStatus } from '../types'
import { countWords } from '../lib/words'
import { db } from './database'

export async function getContinueTarget(): Promise<{ storyId: string; chapterId: string } | null> {
  const stories = await db.stories.orderBy('lastOpenedAt').reverse().toArray()
  const story = stories[0]
  if (!story) return null
  const activeChapters = await db.chapters
    .where('storyId')
    .equals(story.id)
    .filter((c) => !c.deletedAt)
    .toArray()
  activeChapters.sort((a, b) => a.order - b.order)
  if (!activeChapters.length) return null
  const preferred = story.lastChapterId
    ? activeChapters.find((c) => c.id === story.lastChapterId)
    : undefined
  const ch = preferred ?? activeChapters[0]
  return { storyId: story.id, chapterId: ch.id }
}

export async function listStoriesWithStats(): Promise<
  Array<{
    story: Story
    chapterCount: number
    wordCount: number
    lastEdited: number
  }>
> {
  const stories = await db.stories.orderBy('updatedAt').reverse().toArray()
  const chapters = await db.chapters.toArray()
  const byStory = new Map<string, Chapter[]>()
  for (const c of chapters) {
    if (c.deletedAt) continue
    const list = byStory.get(c.storyId) ?? []
    list.push(c)
    byStory.set(c.storyId, list)
  }
  return stories.map((story) => {
    const chs = byStory.get(story.id) ?? []
    const wordCount = chs.reduce((a, c) => a + c.wordCount, 0)
    const lastCh = chs.reduce<number>((max, c) => Math.max(max, c.updatedAt), story.updatedAt)
    return {
      story,
      chapterCount: chs.length,
      wordCount,
      lastEdited: Math.max(story.updatedAt, lastCh),
    }
  })
}

export async function touchStoryOpened(storyId: string, chapterId: string | null) {
  const now = Date.now()
  await db.stories.update(storyId, {
    lastOpenedAt: now,
    lastChapterId: chapterId,
    updatedAt: now,
  })
}

export async function createStory(input: {
  title: string
  description: string
  genre: string
  status: StoryStatus
  coverColor: string | null
}): Promise<{ story: Story; chapter: Chapter }> {
  const now = Date.now()
  const storyId = nanoid()
  const chapterId = nanoid()
  const story: Story = {
    id: storyId,
    title: input.title.trim() || 'Untitled story',
    description: input.description.trim(),
    genre: input.genre.trim() || 'General',
    status: input.status,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    lastChapterId: chapterId,
    coverColor: input.coverColor,
  }
  const content = `# ${story.title}\n\nStart writing here.`
  const chapter: Chapter = {
    id: chapterId,
    storyId,
    title: 'Chapter 1',
    content,
    order: 0,
    status: 'draft',
    wordCount: countWords(content),
    updatedAt: now,
    notes: '',
    deletedAt: null,
  }
  await db.transaction('rw', [db.stories, db.chapters], async () => {
    await db.stories.add(story)
    await db.chapters.add(chapter)
  })
  return { story, chapter }
}

export async function updateStoryMeta(
  id: string,
  patch: Partial<Pick<Story, 'title' | 'description' | 'genre' | 'status' | 'coverColor'>>,
) {
  await db.stories.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteStoryCascade(storyId: string) {
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
      await db.stories.delete(storyId)
      await db.chapters.where('storyId').equals(storyId).delete()
      await db.characters.where('storyId').equals(storyId).delete()
      await db.outlineItems.where('storyId').equals(storyId).delete()
      await db.timelineEvents.where('storyId').equals(storyId).delete()
      await db.storyNotes.where('storyId').equals(storyId).delete()
      await db.worldEntries.where('storyId').equals(storyId).delete()
      await db.snapshots.where('storyId').equals(storyId).delete()
    },
  )
}

export async function duplicateStory(storyId: string): Promise<string | null> {
  const orig = await db.stories.get(storyId)
  if (!orig) return null
  const now = Date.now()
  const newStoryId = nanoid()
  const chapterIdMap = new Map<string, string>()

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
      const chapters = await db.chapters.where('storyId').equals(storyId).toArray()
      const newChapters: Chapter[] = chapters.map((c) => {
        const nid = nanoid()
        chapterIdMap.set(c.id, nid)
        return {
          ...c,
          id: nid,
          storyId: newStoryId,
          updatedAt: now,
        }
      })

      const newStory: Story = {
        ...orig,
        id: newStoryId,
        title: `${orig.title} (copy)`,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        lastChapterId: orig.lastChapterId ? chapterIdMap.get(orig.lastChapterId) ?? null : null,
      }

      const characters = await db.characters.where('storyId').equals(storyId).toArray()
      const newCharacters = characters.map((ch) => ({
        ...ch,
        id: nanoid(),
        storyId: newStoryId,
        linkedChapterIds: ch.linkedChapterIds
          .map((id) => chapterIdMap.get(id))
          .filter((id): id is string => typeof id === 'string'),
      }))

      const outlines = await db.outlineItems.where('storyId').equals(storyId).toArray()
      const newOutlines = outlines.map((o) => ({
        ...o,
        id: nanoid(),
        storyId: newStoryId,
        linkedChapterId: o.linkedChapterId ? chapterIdMap.get(o.linkedChapterId) ?? null : null,
      }))

      const events = await db.timelineEvents.where('storyId').equals(storyId).toArray()
      const newEvents = events.map((e) => ({
        ...e,
        id: nanoid(),
        storyId: newStoryId,
        relatedChapterId: e.relatedChapterId ? chapterIdMap.get(e.relatedChapterId) ?? null : null,
      }))

      const notes = await db.storyNotes.where('storyId').equals(storyId).toArray()
      const newNotes = notes.map((n) => ({
        ...n,
        id: nanoid(),
        storyId: newStoryId,
        updatedAt: now,
      }))

      const worlds = await db.worldEntries.where('storyId').equals(storyId).toArray()
      const newWorlds = worlds.map((w) => ({
        ...w,
        id: nanoid(),
        storyId: newStoryId,
        updatedAt: now,
      }))

      const snaps = await db.snapshots.where('storyId').equals(storyId).toArray()
      const newSnaps = snaps
        .map((s) => {
          const cid = chapterIdMap.get(s.chapterId)
          if (!cid) return null
          return {
            ...s,
            id: nanoid(),
            storyId: newStoryId,
            chapterId: cid,
            createdAt: s.createdAt,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      await db.stories.add(newStory)
      if (newChapters.length) await db.chapters.bulkAdd(newChapters)
      if (newCharacters.length) await db.characters.bulkAdd(newCharacters)
      if (newOutlines.length) await db.outlineItems.bulkAdd(newOutlines)
      if (newEvents.length) await db.timelineEvents.bulkAdd(newEvents)
      if (newNotes.length) await db.storyNotes.bulkAdd(newNotes)
      if (newWorlds.length) await db.worldEntries.bulkAdd(newWorlds)
      if (newSnaps.length) await db.snapshots.bulkAdd(newSnaps)
    },
  )

  return newStoryId
}
