import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { schemaTables } from '../db/schema-info'
import { fillEveryTable, makeTestDb } from '../db/test-utils'
import { countRows, listDataTables, NON_DATA_TABLES, schemaOddities } from '../repositories/backup'

// Strażnicy: kopia zapasowa jest generyczna (każda tabela danych), więc pilnujemy założeń,
// na których to stoi — inaczej nowa tabela/obiekt po cichu wypadłby z eksportu lub przywracania.

let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
})
afterEach(() => conn.sqlite.close())

describe('pokrycie kopii zapasowej', () => {
  it('schema.ts ↔ baza po migracjach: te same tabele i kolumny (brak zapomnianej migracji)', () => {
    const db = listDataTables(conn.sqlite).map((t) => ({ name: t.name, columns: t.columns.map((c) => c.name).sort() }))
    expect(db).toEqual(schemaTables())
  })

  it('każda tabela danych trafia do kopii; pomijane są tylko historia migracji i metadane kopii', () => {
    const all = conn.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .pluck()
      .all() as string[]
    const data = listDataTables(conn.sqlite).map((t) => t.name)
    expect(all.filter((n) => !data.includes(n))).toEqual(['__drizzle_migrations'])
    expect(NON_DATA_TABLES).toEqual(['__drizzle_migrations', 'tracker_backup'])
  })

  it('brak triggerów, widoków, tabel wirtualnych i WITHOUT ROWID — inaczej zdecyduj, jak odtwarza je przywracanie (core/repositories/backup.ts)', () => {
    expect(schemaOddities(conn.sqlite)).toEqual({ triggers: [], views: [], virtualTables: [], withoutRowid: [] })
  })

  it('fillEveryTable: ≥2 wiersze w KAŻDEJ tabeli danych — nowa tabela nie wypadnie z testu round-trip', () => {
    fillEveryTable(conn.sqlite)
    const counts = countRows(conn.sqlite, listDataTables(conn.sqlite))
    expect(Object.keys(counts).length).toBe(schemaTables().length)
    for (const [table, n] of Object.entries(counts)) expect({ table, n }).toEqual({ table, n: 2 })
  })
})
