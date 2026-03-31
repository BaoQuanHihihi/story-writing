import { nanoid } from 'nanoid'
import type {
  Chapter,
  Character,
  OutlineItem,
  Story,
  StoryNote,
  TimelineEvent,
  WorldEntry,
} from '../types'
import { countWords } from '../lib/words'
import { db } from './database'

export async function seedIfEmpty(): Promise<void> {
  const n = await db.stories.count()
  if (n > 0) return

  const now = Date.now()
  const storyId = nanoid()

  const story: Story = {
    id: storyId,
    title: 'The Lanternmaker’s Daughter',
    description:
      'In a harbor town where night comes early, a young woman learns her family’s craft lights more than streets.',
    genre: 'Literary fantasy',
    status: 'ongoing',
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    lastChapterId: null,
    coverColor: '#b45309',
  }

  const ch1Content = `## The first flame

Mara closed the workshop shutters against the rain. Brass shavings glinted on the bench like someone spilled stars.

She tested the wick with two fingers and found it *exactly* too long—long enough to be impatient, short enough to pretend she hadn’t noticed her own hurry.

> Continuity: lanterns must always be fitted **blue** first. Mother’s rule.

The harbor horn sounded, low and gray, and the whole town leaned into the sound as if it were a pillow.`

  const ch2Content = `## Salt on the hinge

By noon the storm had thinned into a drizzle that pretended to be mist. Mara carried a paper parcel beneath her arm and tried to walk as if she had nowhere to be.

The door to the archives stuck—always—and when she leaned, the hinge complained in a voice she had learned to translate: *not today, not like this, not with you carrying that hope.*

She went in anyway.`

  const ch1: Chapter = {
    id: nanoid(),
    storyId,
    title: 'The first flame',
    content: ch1Content,
    order: 0,
    status: 'in_progress',
    wordCount: countWords(ch1Content),
    updatedAt: now,
    notes: 'Opening tone: quiet, tactile. Avoid exposition dumps in ch.2.',
    deletedAt: null,
  }

  const ch2: Chapter = {
    id: nanoid(),
    storyId,
    title: 'Salt on the hinge',
    content: ch2Content,
    order: 1,
    status: 'draft',
    wordCount: countWords(ch2Content),
    updatedAt: now,
    notes: '',
    deletedAt: null,
  }

  story.lastChapterId = ch1.id

  const character: Character = {
    id: nanoid(),
    storyId,
    name: 'Mara Hale',
    role: 'Protagonist',
    description: 'Apprentice lanternmaker, steady hands, restless curiosity.',
    personality: 'Observant; soft-spoken until pushed; humor dry as kiln dust.',
    goals: 'Keep the shop alive; understand why her mother forbade certain oils.',
    relationships: 'Mother (deceased, memory heavy); town clerk (wary ally).',
    notes: 'Physical motif: soot under nails, not as “grit” but as pride.',
    linkedChapterIds: [ch1.id, ch2.id],
  }

  const outline: OutlineItem[] = [
    {
      id: nanoid(),
      storyId,
      title: 'Act I — The craft',
      summary: 'Establish workshop, loss, first sign of “wrong” flame.',
      order: 0,
      linkedChapterId: ch1.id,
    },
    {
      id: nanoid(),
      storyId,
      title: 'Act II — The archives',
      summary: 'Mara discovers a record that reframes the family prohibition.',
      order: 1,
      linkedChapterId: ch2.id,
    },
  ]

  const timeline: TimelineEvent[] = [
    {
      id: nanoid(),
      storyId,
      title: 'Storm week',
      description: 'Harbor closed; lantern demand spikes; rumors spread.',
      relatedChapterId: ch1.id,
      order: 0,
      dateLabel: 'Early autumn',
    },
    {
      id: nanoid(),
      storyId,
      title: 'Archive visit',
      description: 'Mara finds a misfiled contract with the lighthouse guild.',
      relatedChapterId: ch2.id,
      order: 1,
      dateLabel: 'Three days later',
    },
  ]

  const note: StoryNote = {
    id: nanoid(),
    storyId,
    title: 'Tone reminders',
    content: 'Warm light vocabulary. Rain as texture instead of gloom.',
    order: 0,
    updatedAt: now,
  }

  const world: WorldEntry = {
    id: nanoid(),
    storyId,
    title: 'Lantern law',
    content:
      'Public lanterns must burn approved oils. Private workshop experiments are tolerated until someone complains.',
    order: 0,
    updatedAt: now,
  }

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
    ],
    async () => {
      await db.stories.add(story)
      await db.chapters.bulkAdd([ch1, ch2])
      await db.characters.add(character)
      await db.outlineItems.bulkAdd(outline)
      await db.timelineEvents.bulkAdd(timeline)
      await db.storyNotes.add(note)
      await db.worldEntries.add(world)
    },
  )
}
