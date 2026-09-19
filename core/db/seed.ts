import type { DB } from './connection'
import { areas, entries, entryTags, entryTypes, sessions, settings, stages, tags } from './schema'
import type { FieldDef, ProgressMode } from '@shared/types'

interface SeedStage {
  name: string
  isDone?: boolean
}
interface SeedType {
  key: string
  name: string
  icon: string
  progressMode: ProgressMode
  autoRetro?: boolean
  showOnBoard?: boolean
  fields?: FieldDef[]
  template?: string[]
  stages: SeedStage[]
}

const STARTER_TYPES: SeedType[] = [
  { key: 'task', name: 'Zadanie', icon: 'check-square', progressMode: 'none', stages: [{ name: 'Do zrobienia' }, { name: 'Zrobione', isDone: true }] },
  { key: 'note', name: 'Notatka', icon: 'note', progressMode: 'none', stages: [] },
  {
    key: 'project', name: 'Projekt', icon: 'cube', progressMode: 'children', autoRetro: true, showOnBoard: true,
    fields: [{ key: 'repo', label: 'Repozytorium', type: 'url' }, { key: 'goal', label: 'Cel', type: 'text' }],
    stages: [{ name: 'Pomysł' }, { name: 'Research' }, { name: 'Implementacja' }, { name: 'Testy i writeup' }, { name: 'Zrobione', isDone: true }]
  },
  {
    key: 'course', name: 'Kurs', icon: 'books', progressMode: 'counter', autoRetro: true,
    fields: [{ key: 'current', label: 'Obecnie', type: 'number' }, { key: 'total', label: 'Łącznie', type: 'number' }],
    stages: [{ name: 'Zaplanowany' }, { name: 'W trakcie' }, { name: 'Powtórka' }, { name: 'Ukończony', isDone: true }]
  },
  {
    key: 'pwn', name: 'Pwn', icon: 'terminal-window', progressMode: 'none', autoRetro: true,
    fields: [
      { key: 'module', label: 'Moduł', type: 'text' },
      { key: 'level', label: 'Poziom', type: 'number' },
      { key: 'technique', label: 'Technika', type: 'select', options: ['stack', 'heap', 'format string', 'ROP', 'kernel'] },
      { key: 'used_writeup', label: 'Korzystałem z writeupu', type: 'bool' }
    ],
    stages: [{ name: 'Do zrobienia' }, { name: 'W trakcie' }, { name: 'Rozwiązane', isDone: true }]
  },
  {
    key: 'crackme', name: 'Crackme', icon: 'lock-key', progressMode: 'children', autoRetro: true, showOnBoard: true,
    fields: [
      { key: 'source', label: 'Źródło', type: 'text' },
      { key: 'protections', label: 'Zabezpieczenia', type: 'text' },
      { key: 'difficulty', label: 'Trudność', type: 'number' }
    ],
    template: ['Recon', 'Analiza statyczna', 'Analiza dynamiczna', 'Writeup'],
    stages: [{ name: 'Do zrobienia' }, { name: 'W trakcie' }, { name: 'Rozwiązane', isDone: true }]
  },
  {
    key: 'offer', name: 'Oferta', icon: 'briefcase', progressMode: 'none', showOnBoard: true,
    fields: [
      { key: 'company', label: 'Firma', type: 'text' },
      { key: 'url', label: 'URL', type: 'url' },
      { key: 'work_mode', label: 'Tryb pracy', type: 'select', options: ['zdalnie', 'hybryda', 'stacjonarnie'] },
      { key: 'company_model', label: 'Model firmy', type: 'select', options: ['in-house', 'software house', 'body leasing'] },
      { key: 'stack_fit', label: 'Dopasowanie stacku', type: 'number' }
    ],
    stages: [{ name: 'Zapisana' }, { name: 'Wysłana' }, { name: 'Rozmowa' }, { name: 'Zadanie techniczne' }, { name: 'Oferta', isDone: true }, { name: 'Odrzucona', isDone: true }]
  }
]

function iso(d: Date): string {
  return d.toISOString()
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Wypełnia świeżą bazę typami startowymi i przykładowymi danymi. Idempotentne. */
export function seed(db: DB, now: Date = new Date()): void {
  const already = db.select().from(entryTypes).all()
  if (already.length > 0) return

  // Typy + etapy
  const typeIdByKey = new Map<string, number>()
  const stageId = (typeKey: string, stageName: string): number | null => {
    const t = typeIdByKey.get(typeKey)
    if (t == null) return null
    return db.select().from(stages).all().find((s) => s.typeId === t && s.name === stageName)?.id ?? null
  }
  for (let i = 0; i < STARTER_TYPES.length; i++) {
    const t = STARTER_TYPES[i]
    const inserted = db
      .insert(entryTypes)
      .values({
        key: t.key, name: t.name, icon: t.icon, fields: t.fields ?? [],
        progressMode: t.progressMode, autoRetro: t.autoRetro ?? false,
        showOnBoard: t.showOnBoard ?? false, template: t.template ?? [], position: i
      })
      .returning({ id: entryTypes.id })
      .get()
    typeIdByKey.set(t.key, inserted.id)
    t.stages.forEach((s, si) => {
      db.insert(stages).values({ typeId: inserted.id, name: s.name, position: si, isDone: s.isDone ?? false }).run()
    })
  }

  // Obszary (kolory jak tokeny --area-N)
  const areaData = [
    ['pwn.college', 'oklch(0.74 0.13 289)'],
    ['Sieci', 'oklch(0.74 0.12 215)'],
    ['C++ / Windows', 'oklch(0.76 0.13 60)'],
    ['Praca', 'oklch(0.74 0.12 152)']
  ]
  const areaIdByName = new Map<string, number>()
  areaData.forEach(([name, color], i) => {
    const a = db.insert(areas).values({ name, color, position: i }).returning({ id: areas.id }).get()
    areaIdByName.set(name, a.id)
  })

  // Tagi
  const tagData: Array<[string, string]> = [
    ['lang', 'cpp'], ['lang', 'python'], ['tech', 'winapi'], ['tech', 'nestjs'], ['tech', 'react'],
    ['technique', 'heap'], ['site', 'pwn.college'],
    ['skill', 'WinAPI handles'], ['skill', 'heap exploitation'], ['skill', 'TCP handshake'], ['skill', 'gdb / pwntools']
  ]
  const tagId = new Map<string, number>()
  for (const [group, name] of tagData) {
    const inserted = db.insert(tags).values({ groupName: group, name, color: null }).returning({ id: tags.id }).get()
    tagId.set(`${group}:${name}`, inserted.id)
  }

  // Wpisy
  const insertEntry = (v: {
    typeKey: string; title: string; parentId?: number | null; areaName?: string; stageName?: string
    data?: Record<string, unknown>; plannedDate?: string; dueDate?: string; completedAt?: string
    tagKeys?: string[]
  }): number => {
    const id = db
      .insert(entries)
      .values({
        typeId: typeIdByKey.get(v.typeKey)!,
        parentId: v.parentId ?? null,
        areaId: v.areaName ? areaIdByName.get(v.areaName) ?? null : null,
        stageId: v.stageName ? stageId(v.typeKey, v.stageName) : null,
        title: v.title,
        descriptionMd: null,
        data: v.data ?? {},
        priority: null,
        plannedDate: v.plannedDate ?? null,
        dueDate: v.dueDate ?? null,
        completedAt: v.completedAt ?? null,
        createdAt: iso(now),
        updatedAt: iso(now)
      })
      .returning({ id: entries.id })
      .get().id
    for (const k of v.tagKeys ?? []) {
      const tid = tagId.get(k)
      if (tid) db.insert(entryTags).values({ entryId: id, tagId: tid }).run()
    }
    return id
  }

  // Kontenery (ukryte na liście Zadań, bo root z dziećmi)
  const parserPe = insertEntry({ typeKey: 'project', title: 'Parser PE w C++', areaName: 'C++ / Windows', stageName: 'Implementacja', data: { goal: 'Własny parser PE pod Windows' } })
  const course = insertEntry({ typeKey: 'course', title: 'pwn.college: Program Security', areaName: 'pwn.college', stageName: 'W trakcie', data: { current: 14, total: 28 } })

  // W trakcie
  const iat = insertEntry({ typeKey: 'task', title: 'Import Address Table', parentId: parserPe, areaName: 'C++ / Windows', stageName: 'Do zrobienia', tagKeys: ['lang:cpp', 'tech:winapi', 'skill:WinAPI handles'] })
  insertEntry({ typeKey: 'task', title: 'Nagłówki DOS i NT', parentId: iat, areaName: 'C++ / Windows', stageName: 'Zrobione', completedAt: iso(addDays(now, -3)) })
  insertEntry({ typeKey: 'task', title: 'Parsowanie relokacji', parentId: iat, areaName: 'C++ / Windows', stageName: 'Do zrobienia' })
  insertEntry({ typeKey: 'task', title: 'Testy IAT na próbkach', parentId: iat, areaName: 'C++ / Windows', stageName: 'Do zrobienia' })

  const babyheap = insertEntry({ typeKey: 'pwn', title: 'babyheap level 3', parentId: course, areaName: 'pwn.college', stageName: 'W trakcie', data: { module: 'Program Security', level: 3, technique: 'heap' }, tagKeys: ['technique:heap', 'site:pwn.college', 'skill:heap exploitation'] })

  // Do zrobienia
  insertEntry({ typeKey: 'task', title: 'Nordwind Labs — follow-up po tygodniu', areaName: 'Praca', stageName: 'Do zrobienia', dueDate: dateKey(addDays(now, -2)) })
  insertEntry({ typeKey: 'task', title: 'Przeczytać RFC 793, sekcja 3.4', areaName: 'Sieci', stageName: 'Do zrobienia', plannedDate: dateKey(addDays(now, 1)), tagKeys: ['skill:TCP handshake'] })
  insertEntry({ typeKey: 'task', title: 'Trening: cyclic i offsety w pwntools', areaName: 'pwn.college', stageName: 'Do zrobienia', data: { practice: true }, tagKeys: ['skill:gdb / pwntools'] })

  // Zrobione dziś
  insertEntry({ typeKey: 'task', title: 'Tabela sekcji', parentId: parserPe, areaName: 'C++ / Windows', stageName: 'Zrobione', completedAt: iso(now) })

  // Sesje: aktywna na IAT + zakończone dające czas
  db.insert(sessions).values({ entryId: iat, startedAt: iso(addMinutes(now, -42)), endedAt: null, note: null }).run()
  db.insert(sessions).values({ entryId: babyheap, startedAt: iso(addMinutes(now, -220)), endedAt: iso(addMinutes(now, -120)), note: null }).run()
  db.insert(sessions).values({ entryId: babyheap, startedAt: iso(addMinutes(now, -90)), endedAt: iso(addMinutes(now, -30)), note: null }).run()

  // Ustawienia
  db.insert(settings).values({ key: 'language', value: 'pl' }).run()
  db.insert(settings).values({ key: 'streakThresholdMinutes', value: 25 }).run()
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000)
}
