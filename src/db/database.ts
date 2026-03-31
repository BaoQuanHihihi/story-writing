import Dexie, { type Table } from 'dexie'
import type {
  Chapter,
  Character,
  OutlineItem,
  Snapshot,
  Story,
  StoryNote,
  TimelineEvent,
  WorldEntry,
} from '../types'

const DB_NAME = 'WriteNestDB'
export const SCHEMA_VERSION = 1

export class WriteNestDB extends Dexie {
  stories!: Table<Story, string>
  chapters!: Table<Chapter, string>
  characters!: Table<Character, string>
  outlineItems!: Table<OutlineItem, string>
  timelineEvents!: Table<TimelineEvent, string>
  storyNotes!: Table<StoryNote, string>
  worldEntries!: Table<WorldEntry, string>
  snapshots!: Table<Snapshot, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      stories: 'id, updatedAt, lastOpenedAt, title',
      chapters: 'id, storyId, order, updatedAt, deletedAt',
      characters: 'id, storyId',
      outlineItems: 'id, storyId, order',
      timelineEvents: 'id, storyId, order',
      storyNotes: 'id, storyId, order',
      worldEntries: 'id, storyId, order',
      snapshots: 'id, storyId, chapterId, createdAt',
    })
  }
}

export const db = new WriteNestDB()
