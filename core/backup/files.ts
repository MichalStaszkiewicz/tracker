import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { LastExport } from '@shared/types'

// Operacje plikowe kopii zapasowej (bez SQL).

export interface SqliteHeader {
  pageSize: number
  /** null, gdy licznik stron w nagłówku jest nieaktualny (stary zapis bez version-valid-for). */
  pageCount: number | null
}

const MAGIC = Buffer.from('SQLite format 3\0', 'latin1')

/** Pierwsze 100 bajtów pliku: magia SQLite, rozmiar strony (1 → 65536), liczba stron, jeśli ważna. */
export function readSqliteHeader(path: string): SqliteHeader | null {
  const buf = Buffer.alloc(100)
  let read = 0
  const fd = openSync(path, 'r')
  try {
    read = readSync(fd, buf, 0, 100, 0)
  } finally {
    closeSync(fd)
  }
  if (read < 100 || !buf.subarray(0, 16).equals(MAGIC)) return null
  const raw = buf.readUInt16BE(16)
  const pageSize = raw === 1 ? 65536 : raw
  const pageCount = buf.readUInt32BE(92) === buf.readUInt32BE(24) ? buf.readUInt32BE(28) : null
  return { pageSize, pageCount }
}

/** Ta sama ścieżka po resolve(); na Windows bez rozróżniania wielkości liter. */
export function samePath(a: string, b: string): boolean {
  const ra = resolve(a)
  const rb = resolve(b)
  return process.platform === 'win32' ? ra.toLowerCase() === rb.toLowerCase() : ra === rb
}

/** Plik bazy na żywo albo jej -wal/-shm — tego nie wolno ani importować, ani nadpisać eksportem. */
export function isLiveDbFile(path: string, liveDbPath: string | null): boolean {
  if (!liveDbPath) return false
  return ['', '-wal', '-shm'].some((suffix) => samePath(path, liveDbPath + suffix))
}

/** Usuwa plik bazy razem z plikami pobocznymi; brak pliku nie jest błędem. */
export function removeDbFiles(path: string): void {
  for (const suffix of ['', '-wal', '-shm', '-journal']) rmSync(path + suffix, { force: true })
}

/** Czyści katalog z wpisów spełniających warunek; brak katalogu nie jest błędem. */
export function sweepDir(dir: string, match: (name: string) => boolean = () => true): void {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    if (match(name)) rmSync(join(dir, name), { recursive: true, force: true })
  }
}

/** Stan ostatniego eksportu (poza bazą — przywrócenie kopii go nie cofa). Brak/śmieci → null. */
export function readLastExport(statePath: string): LastExport | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(statePath, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) return null
    const last: unknown = (parsed as { lastExport?: unknown }).lastExport
    if (typeof last !== 'object' || last === null) return null
    const { at, path } = last as { at?: unknown; path?: unknown }
    return typeof at === 'string' && typeof path === 'string' ? { at, path } : null
  } catch {
    return null
  }
}

/** Zapis atomowy: plik tymczasowy + rename (przerwany zapis nie zostawia śmieci w miejscu stanu). */
export function writeLastExport(statePath: string, last: LastExport): void {
  const tmp = `${statePath}.tmp`
  writeFileSync(tmp, JSON.stringify({ lastExport: last }, null, 2))
  renameSync(tmp, statePath)
}
