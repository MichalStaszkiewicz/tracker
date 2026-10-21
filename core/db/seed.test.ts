import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from './connection'
import { entryTypes, settings, stages } from './schema'
import { seed } from './seed'
import { makeTestDb } from './test-utils'
import { getAllSettings, setSetting } from '../repositories/settings'

let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
})
afterEach(() => conn.sqlite.close())

describe('seed', () => {
  it('baza bez typów, ale z ustawieniem language — nie rzuca, dodaje typy, zachowuje język', () => {
    setSetting(conn.db, 'language', 'en')
    expect(() => seed(conn.db)).not.toThrow()
    expect(conn.db.select().from(entryTypes).all().length).toBeGreaterThan(0)
    expect(getAllSettings(conn.db).language).toBe('en')
  })

  it('drugi przebieg niczego nie zmienia', () => {
    seed(conn.db)
    const snap = () => ({
      types: conn.db.select().from(entryTypes).all(),
      stages: conn.db.select().from(stages).all(),
      settings: conn.db.select().from(settings).all()
    })
    const before = snap()
    seed(conn.db)
    expect(snap()).toEqual(before)
  })
})
