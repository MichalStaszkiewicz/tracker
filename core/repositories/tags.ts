import { and, asc, eq } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { entryTags, tags } from '../db/schema'
import type { Tag } from '@shared/types'

export function listTags(db: DB): Tag[] {
  return db.select().from(tags).orderBy(asc(tags.groupName), asc(tags.name)).all()
}

/** Znajduje tag po grupie i nazwie, albo tworzy nowy. */
export function findOrCreateTag(db: DB, groupName: string, name: string): Tag {
  const existing = db
    .select()
    .from(tags)
    .where(and(eq(tags.groupName, groupName), eq(tags.name, name)))
    .get()
  if (existing) return existing
  const inserted = db
    .insert(tags)
    .values({ groupName, name, color: null })
    .returning()
    .get()
  return inserted
}

/** Dodaje tag (tworząc go w razie potrzeby) do wpisu. */
export function addTagToEntry(db: DB, entryId: number, groupName: string, name: string): Tag {
  const tag = findOrCreateTag(db, groupName, name)
  db.insert(entryTags).values({ entryId, tagId: tag.id }).onConflictDoNothing().run()
  return tag
}

/** Odpina tag od wpisu (sam tag zostaje w słowniku). */
export function removeTagFromEntry(db: DB, entryId: number, tagId: number): void {
  db.delete(entryTags).where(and(eq(entryTags.entryId, entryId), eq(entryTags.tagId, tagId))).run()
}
