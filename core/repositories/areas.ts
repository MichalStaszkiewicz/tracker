import { asc } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { areas } from '../db/schema'
import type { Area } from '@shared/types'

export function listAreas(db: DB): Area[] {
  return db.select().from(areas).orderBy(asc(areas.position)).all()
}
