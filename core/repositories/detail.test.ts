import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { seed } from '../db/seed'
import { getEntryDetail, listTasks, updateEntry } from './entries'
import { addLink, listLinks, removeLink } from './links'
import { addTagToEntry, removeTagFromEntry } from './tags'

const NOW = new Date(2026, 8, 18, 14, 0, 0)
let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
  seed(conn.db, NOW)
})
const idOf = (title: string) => listTasks(conn.db, 'active', NOW).find((i) => i.title === title)!.id

describe('getEntryDetail', () => {
  it('składa pełny wpis z typem, polami, tagami, podzadaniami', () => {
    const d = getEntryDetail(conn.db, idOf('Import Address Table'))!
    expect(d.type.key).toBe('task')
    expect(d.area?.name).toBe('C++ / Windows')
    expect(d.tags.some((t) => t.groupName === 'skill' && t.name === 'WinAPI handles')).toBe(true)
    expect(d.children).toHaveLength(3)
    expect(d.stages.length).toBeGreaterThan(0)
  })

  it('udostępnia pola typu (data) i definicję pól', () => {
    const d = getEntryDetail(conn.db, idOf('babyheap level 3'))!
    expect(d.type.key).toBe('pwn')
    expect(d.data.technique).toBe('heap')
    expect(d.type.fields.some((f) => f.key === 'technique' && f.type === 'select')).toBe(true)
  })

  it('null dla nieistniejącego wpisu', () => {
    expect(getEntryDetail(conn.db, 99999)).toBeNull()
  })
})

describe('updateEntry', () => {
  it('aktualizuje tytuł, opis i pola typu', () => {
    const id = idOf('babyheap level 3')
    const d = updateEntry(conn.db, id, {
      title: 'babyheap level 4',
      descriptionMd: '# Writeup\ntcache poisoning',
      data: { module: 'Program Security', level: 4, technique: 'heap' }
    })
    expect(d.title).toBe('babyheap level 4')
    expect(d.descriptionMd).toContain('Writeup')
    expect(d.data.level).toBe(4)
  })

  it('scala pola typu — aktualizacja jednego pola nie kasuje reszty', () => {
    const id = idOf('babyheap level 3')
    updateEntry(conn.db, id, { data: { level: 5 } })
    const d = getEntryDetail(conn.db, id)!
    expect(d.data.level).toBe(5)
    expect(d.data.technique).toBe('heap')
  })
})

describe('linki', () => {
  it('dodaje i usuwa link', () => {
    const id = idOf('Import Address Table')
    const link = addLink(conn.db, id, 'url', 'Writeup', 'https://example.com/wu')
    expect(getEntryDetail(conn.db, id)!.links.map((l) => l.label)).toContain('Writeup')
    removeLink(conn.db, link.id)
    expect(listLinks(conn.db, id)).toHaveLength(0)
  })
})

describe('tagi wpisu', () => {
  it('dopina i odpina tag', () => {
    const id = idOf('Przeczytać RFC 793, sekcja 3.4')
    const tag = addTagToEntry(conn.db, id, 'tech', 'tcp')
    expect(getEntryDetail(conn.db, id)!.tags.some((t) => t.name === 'tcp')).toBe(true)
    removeTagFromEntry(conn.db, id, tag.id)
    expect(getEntryDetail(conn.db, id)!.tags.some((t) => t.name === 'tcp')).toBe(false)
  })
})
