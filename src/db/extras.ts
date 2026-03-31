import { nanoid } from 'nanoid'
import type { Character, OutlineItem, StoryNote, TimelineEvent, WorldEntry } from '../types'
import { db } from './database'

export async function listCharacters(storyId: string) {
  return db.characters.where('storyId').equals(storyId).toArray()
}

export async function upsertCharacter(row: Character) {
  await db.characters.put(row)
}

export async function deleteCharacter(id: string) {
  await db.characters.delete(id)
}

export async function listOutline(storyId: string) {
  const rows = await db.outlineItems.where('storyId').equals(storyId).toArray()
  rows.sort((a, b) => a.order - b.order)
  return rows
}

export async function upsertOutline(row: OutlineItem) {
  await db.outlineItems.put(row)
}

export async function deleteOutline(id: string) {
  await db.outlineItems.delete(id)
}

export async function listTimeline(storyId: string) {
  const rows = await db.timelineEvents.where('storyId').equals(storyId).toArray()
  rows.sort((a, b) => a.order - b.order)
  return rows
}

export async function upsertTimeline(row: TimelineEvent) {
  await db.timelineEvents.put(row)
}

export async function deleteTimeline(id: string) {
  await db.timelineEvents.delete(id)
}

export async function listNotes(storyId: string) {
  const rows = await db.storyNotes.where('storyId').equals(storyId).toArray()
  rows.sort((a, b) => a.order - b.order)
  return rows
}

export async function upsertNote(row: StoryNote) {
  await db.storyNotes.put(row)
}

export async function deleteNote(id: string) {
  await db.storyNotes.delete(id)
}

export async function listWorld(storyId: string) {
  const rows = await db.worldEntries.where('storyId').equals(storyId).toArray()
  rows.sort((a, b) => a.order - b.order)
  return rows
}

export async function upsertWorld(row: WorldEntry) {
  await db.worldEntries.put(row)
}

export async function deleteWorld(id: string) {
  await db.worldEntries.delete(id)
}

export function newId() {
  return nanoid()
}
