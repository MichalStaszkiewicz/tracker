import { asc, eq } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { links } from '../db/schema'
import type { Link } from '@shared/types'

export function listLinks(db: DB, entryId: number): Link[] {
  return db.select().from(links).where(eq(links.entryId, entryId)).orderBy(asc(links.id)).all()
}

export function addLink(db: DB, entryId: number, kind: string, label: string, target: string): Link {
  return db.insert(links).values({ entryId, kind, label, target }).returning().get()
}

export function updateLink(
  db: DB,
  id: number,
  patch: { kind?: string; label?: string; target?: string }
): void {
  db.update(links).set(patch).where(eq(links.id, id)).run()
}

export function removeLink(db: DB, id: number): void {
  db.delete(links).where(eq(links.id, id)).run()
}
