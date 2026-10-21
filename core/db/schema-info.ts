import { is } from 'drizzle-orm'
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core'
import * as schema from './schema'

export interface SchemaTable {
  name: string
  columns: string[]
}

function tables(): SQLiteTable[] {
  const values: unknown[] = Object.values(schema)
  return values.filter((v): v is SQLiteTable => is(v, SQLiteTable))
}

/** Tabele i kolumny zadeklarowane w schema.ts (nazwy jak w bazie), posortowane po nazwie. */
export function schemaTables(): SchemaTable[] {
  return tables()
    .map((t) => {
      const cfg = getTableConfig(t)
      return { name: cfg.name, columns: cfg.columns.map((c) => c.name).sort() }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Kolumny `mode: 'json'` — drizzle robi na nich gołe JSON.parse, więc kopia musi mieć tam poprawny JSON. */
export function jsonColumns(): Array<{ table: string; column: string }> {
  const out: Array<{ table: string; column: string }> = []
  for (const t of tables()) {
    const cfg = getTableConfig(t)
    for (const c of cfg.columns) if (c.dataType === 'json') out.push({ table: cfg.name, column: c.name })
  }
  return out.sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`))
}
