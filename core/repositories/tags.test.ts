import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { seedDemo } from '../db/seed'
import { findOrCreateTag, listTags } from './tags'

let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
  seedDemo(conn.db, new Date(2026, 8, 18))
})

describe('listTags', () => {
  it('zwraca tagi z seeda posortowane wg grupy i nazwy', () => {
    const tags = listTags(conn.db)
    expect(tags.length).toBeGreaterThan(0)
    expect(tags.some((t) => t.groupName === 'skill' && t.name === 'heap exploitation')).toBe(true)
  })
})

describe('findOrCreateTag', () => {
  it('tworzy nowy, a drugim razem zwraca istniejący', () => {
    const a = findOrCreateTag(conn.db, 'tech', 'svelte')
    const b = findOrCreateTag(conn.db, 'tech', 'svelte')
    expect(a.id).toBe(b.id)
    expect(listTags(conn.db).filter((t) => t.name === 'svelte')).toHaveLength(1)
  })
})
