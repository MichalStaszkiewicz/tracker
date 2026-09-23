import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { seedDemo } from '../db/seed'
import { commitImport, listOffers, previewImport } from './offers'
import { listTasks, moveEntry } from './entries'

const NOW = new Date(2026, 8, 18, 14, 0, 0)
let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
  seedDemo(conn.db, NOW)
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

  it('nowe oferty lądują na końcu ręcznej kolejności — także po przestawieniu listy', () => {
    const ids = listTasks(conn.db, 'active', NOW).map((i) => i.id)
    moveEntry(conn.db, ids[ids.length - 1], ids[0], 'before') // normalizuje pozycje do 0..n-1
    commitImport(
      conn.db,
      [
        { company: 'Pierwsza', position: 'Oferta A', url: 'https://x.example/a' },
        { company: 'Druga', position: 'Oferta B', url: 'https://x.example/b' }
      ],
      NOW
    )
    const titles = listTasks(conn.db, 'active', NOW).map((i) => i.title)
    expect(titles.slice(-2)).toEqual(['Oferta A', 'Oferta B'])
  })
})
