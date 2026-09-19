import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { seed } from '../db/seed'
import { commitImport, listOffers, previewImport } from './offers'

const NOW = new Date(2026, 8, 18, 14, 0, 0)
let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
  seed(conn.db, NOW)
})

describe('listOffers', () => {
  it('mapuje oferty z seeda z domeną jako źródłem', () => {
    const offers = listOffers(conn.db)
    const nordwind = offers.find((o) => o.company === 'Nordwind Labs')
    expect(nordwind?.source).toBe('justjoin.it')
    expect(nordwind?.position).toBe('Fullstack Developer (React/Nest)')
    expect(nordwind?.salary).toBe('20–26k')
  })
})

describe('previewImport — dedup po URL', () => {
  it('rozdziela nowe / duplikaty / błędy', () => {
    const preview = previewImport(conn.db, [
      { company: 'Nordwind Labs', position: 'Fullstack', url: 'https://JustJoin.it/offer/nordwind-fullstack/?utm=x' }, // duplikat istniejącego
      { company: 'New Co', position: 'Dev', url: 'https://x.example/1' }, // nowa
      { company: '', position: '', url: 'https://y.example' }, // błąd
      { company: 'New Co', position: 'Dev 2', url: 'https://x.example/1' } // duplikat w partii
    ])
    expect(preview.newItems).toHaveLength(1)
    expect(preview.duplicates).toHaveLength(2)
    expect(preview.errors).toHaveLength(1)
  })
})

describe('commitImport', () => {
  it('wstawia tylko nowe, pomija duplikaty', () => {
    const before = listOffers(conn.db).length
    const res = commitImport(
      conn.db,
      [
        { company: 'New Co', position: 'Dev', url: 'https://x.example/1' },
        { company: 'Nordwind Labs', position: 'F', url: 'https://justjoin.it/offer/nordwind-fullstack' }
      ],
      NOW
    )
    expect(res.imported).toBe(1)
    expect(listOffers(conn.db)).toHaveLength(before + 1)
  })
})
