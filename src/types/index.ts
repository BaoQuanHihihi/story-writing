export type StoryStatus = 'draft' | 'ongoing' | 'completed' | 'paused'

export type ChapterStatus = 'draft' | 'in_progress' | 'complete' | 'needs_revision'

export type SnapshotType = 'autosave' | 'manual' | 'checkpoint'

export interface Story {
  id: string
  title: string
  description: string
  genre: string
  status: StoryStatus
  createdAt: number
  updatedAt: number
  lastOpenedAt: number
  lastChapterId: string | null
  coverColor: string | null
}

export interface Chapter {
  id: string
  storyId: string
  title: string
  /** Markdown-ish plain text (bold/italic/headings via markers). */
  content: string
  order: number
  status: ChapterStatus
  wordCount: number
  updatedAt: number
  notes: string
  deletedAt: number | null
}

export interface Character {
  id: string
  storyId: string
  name: string
  role: string
  description: string
  personality: string
  goals: string
  relationships: string
  notes: string
  /** Optional chapter ids this character tags as “in this chapter”. */
  linkedChapterIds: string[]
}

export interface OutlineItem {
  id: string
  storyId: string
  title: string
  summary: string
  order: number
  linkedChapterId: string | null
}

export interface TimelineEvent {
  id: string
  storyId: string
  title: string
  description: string
  relatedChapterId: string | null
  order: number
  dateLabel: string
}

export interface StoryNote {
  id: string
  storyId: string
  title: string
  content: string
  order: number
  updatedAt: number
}

export interface WorldEntry {
  id: string
  storyId: string
  title: string
  content: string
  order: number
  updatedAt: number
}

export interface Snapshot {
  id: string
  storyId: string
  chapterId: string
  content: string
  createdAt: number
  type: SnapshotType
  pinned: boolean
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  editorMaxWidth: 'narrow' | 'comfortable' | 'wide'
  autosaveDebounceMs: number
  periodicSnapshotMs: number
  dailyWordGoal: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 18,
  editorMaxWidth: 'comfortable',
  autosaveDebounceMs: 900,
  periodicSnapshotMs: 5 * 60 * 1000,
  dailyWordGoal: 500,
}

export interface BackupPayload {
  schemaVersion: number
  exportedAt: string
  stories: Story[]
  chapters: Chapter[]
  characters: Character[]
  outlineItems: OutlineItem[]
  timelineEvents: TimelineEvent[]
  storyNotes: StoryNote[]
  worldEntries: WorldEntry[]
  snapshots: Snapshot[]
}
