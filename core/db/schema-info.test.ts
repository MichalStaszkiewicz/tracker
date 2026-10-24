import { describe, expect, it } from 'vitest'
import { jsonColumns, schemaTables } from './schema-info'

describe('schema-info', () => {
  it('schemaTables: wszystkie tabele schema.ts z kolumnami (nazwy z bazy)', () => {
    const t = schemaTables()
    expect(t.map((x) => x.name)).toEqual([
      'areas',
      'entries',
      'entry_tags',
      'entry_types',
      'links',
      'retro_skills',
      'retros',
      'sessions',
      'settings',
      'stages',
      'tags'
    ])
    expect(t.find((x) => x.name === 'sessions')?.columns).toEqual(['ended_at', 'entry_id', 'group_id', 'id', 'note', 'started_at'])
  })

  it('jsonColumns: wykrywa entries.data, entry_types.fields/template, retros.extra, settings.value', () => {
    expect(jsonColumns()).toEqual([
      { table: 'entries', column: 'data' },
      { table: 'entry_types', column: 'fields' },
      { table: 'entry_types', column: 'template' },
      { table: 'retros', column: 'extra' },
      { table: 'settings', column: 'value' }
    ])
  })
})
