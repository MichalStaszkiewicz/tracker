import { and, eq, isNull } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { areas, entries, entryTypes, stages } from '../db/schema'
import { normalizeUrl, urlHost } from '@shared/url'
import { nextEntryPosition } from './entries'
import type { ImportOffer, ImportPreview, OfferRow } from '@shared/types'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export function listOffers(db: DB): OfferRow[] {
  const type = db.select().from(entryTypes).where(eq(entryTypes.key, 'offer')).get()
  if (!type) return []
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.typeId, type.id), isNull(entries.deletedAt)))
    .all()
    .map((e) => {
      const d = e.data
      const url = str(d.url)
      return {
        id: e.id,
        company: str(d.company),
        position: e.title,
        salary: str(d.salary),
        workMode: str(d.work_mode),
        location: str(d.location),
        source: url ? urlHost(url) : '',
        url,
        createdAt: e.createdAt
      }
    })
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
      return b.id - a.id // stały tiebreak dla identycznych znaczników czasu
    })
}

function categorize(existing: Set<string>, offers: ImportOffer[]): ImportPreview {
  const seen = new Set<string>()
  const preview: ImportPreview = { newItems: [], duplicates: [], errors: [] }
  for (const o of offers) {
    if (!o.position?.trim() && !o.company?.trim()) {
      preview.errors.push({ offer: o, reason: 'brak firmy i stanowiska' })
      continue
    }
    const key = o.url ? normalizeUrl(o.url) : ''
    if (key && (existing.has(key) || seen.has(key))) {
      preview.duplicates.push(o)
      continue
    }
    if (key) seen.add(key)
    preview.newItems.push(o)
  }
  return preview
}

function existingUrls(db: DB): Set<string> {
  return new Set(
    listOffers(db)
      .map((o) => (o.url ? normalizeUrl(o.url) : ''))
      .filter(Boolean)
  )
}

/** Podgląd importu: nowe / duplikaty (po znormalizowanym URL) / błędy. */
export function previewImport(db: DB, offers: ImportOffer[]): ImportPreview {
  return categorize(existingUrls(db), offers)
}

/** Import: wstawia tylko nowe (pomija duplikaty i błędy). Zwraca liczbę dodanych. */
export function commitImport(db: DB, offers: ImportOffer[], now: Date = new Date()): { imported: number } {
  const type = db.select().from(entryTypes).where(eq(entryTypes.key, 'offer')).get()
  if (!type) throw new Error('Brak typu offer w bazie')
  const firstStage = db
    .select()
    .from(stages)
    .where(eq(stages.typeId, type.id))
    .all()
    .sort((a, b) => a.position - b.position)[0]
  const workArea = db.select().from(areas).where(eq(areas.name, 'Praca')).get()
  const iso = now.toISOString()

  const { newItems } = categorize(existingUrls(db), offers)
  const basePosition = nextEntryPosition(db) // nowe oferty na końcu ręcznej kolejności
  // Atomowo: albo wchodzą wszystkie nowe, albo żadna (bez połowicznego importu).
  db.transaction((tx) => {
    for (const [i, o] of newItems.entries()) {
      const data: Record<string, unknown> = {}
      if (o.company) data.company = o.company
      if (o.url) data.url = o.url
      if (o.workMode) data.work_mode = o.workMode
      if (o.salary) data.salary = o.salary
      if (o.location) data.location = o.location
      tx.insert(entries)
        .values({
          typeId: type.id,
          areaId: workArea?.id ?? null,
          stageId: firstStage?.id ?? null,
          title: (o.position || o.company || 'Oferta').trim(),
          data,
          position: basePosition + i,
          createdAt: iso,
          updatedAt: iso
        })
        .run()
    }
  })
  return { imported: newItems.length }
}
