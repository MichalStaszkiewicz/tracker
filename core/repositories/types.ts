import { asc } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { entryTypes } from '../db/schema'
import type { EntryType } from '@shared/types'

export function listTypes(db: DB): EntryType[] {
  return db
    .select()
    .from(entryTypes)
    .orderBy(asc(entryTypes.position))
    .all()
    .map((t) => ({
      id: t.id,
      key: t.key,
      name: t.name,
      icon: t.icon,
      fields: t.fields,
      progressMode: t.progressMode,
      autoRetro: t.autoRetro,
      showOnBoard: t.showOnBoard,
      template: t.template,
      position: t.position
    }))
}
