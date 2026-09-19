import { asc } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { areas } from '../db/schema'
import type { Area } from '@shared/types'

export function listAreas(db: DB): Area[] {
  return db.select().from(areas).orderBy(asc(areas.position)).all()
}

/** Tworzy obszar na końcu listy. */
export function createArea(db: DB, name: string, color: string): Area {
  const maxPos = db
    .select()
    .from(areas)
    .all()
    .reduce((m, a) => Math.max(m, a.position), -1)
  return db
    .insert(areas)
    .values({ name: name.trim(), color, position: maxPos + 1 })
    .returning()
    .get()
}
