import { eq } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { settings } from '../db/schema'

export function getAllSettings(db: DB): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const row of db.select().from(settings).all()) {
    out[row.key] = row.value
  }
  return out
}

export function getSetting(db: DB, key: string): unknown {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value
}

export function setSetting(db: DB, key: string, value: unknown): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run()
}
