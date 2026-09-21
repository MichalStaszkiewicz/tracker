import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { seedDemo } from '../db/seed'
import { createArea, listAreas } from './areas'

const NOW = new Date(2026, 8, 18, 14, 0, 0)
let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
  seedDemo(conn.db, NOW)
})

describe('createArea', () => {
  it('dodaje obszar na końcu i zwraca go', () => {
    const before = listAreas(conn.db)
    const created = createArea(conn.db, 'Reverse engineering', 'oklch(0.74 0.13 320)')
    expect(created.name).toBe('Reverse engineering')
    expect(created.position).toBe(before.length)
    const after = listAreas(conn.db)
    expect(after).toHaveLength(before.length + 1)
    expect(after.at(-1)?.id).toBe(created.id)
  })
})
