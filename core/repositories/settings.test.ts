import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { getAllSettings, getSetting, setSetting } from './settings'

let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
})

describe('settings repo', () => {
  it('zapisuje i czyta wartość (JSON)', () => {
    setSetting(conn.db, 'language', 'en')
    setSetting(conn.db, 'streakThresholdMinutes', 40)
    expect(getSetting(conn.db, 'language')).toBe('en')
    expect(getSetting(conn.db, 'streakThresholdMinutes')).toBe(40)
  })

  it('upsert nadpisuje istniejący klucz', () => {
    setSetting(conn.db, 'backup', true)
    setSetting(conn.db, 'backup', false)
    expect(getSetting(conn.db, 'backup')).toBe(false)
  })

  it('getAllSettings zwraca mapę', () => {
    setSetting(conn.db, 'a', 1)
    setSetting(conn.db, 'b', 'x')
    expect(getAllSettings(conn.db)).toEqual({ a: 1, b: 'x' })
  })
})
