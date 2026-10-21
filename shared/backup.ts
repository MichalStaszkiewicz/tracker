// Kopia zapasowa — czyste stałe i funkcje (format pliku, nazwy, plan poziomu schematu).

export const BACKUP_FORMAT = 'tracker-backup'
export const BACKUP_FORMAT_VERSION = 1
/** Większy plik nie jest kopią Trackera (baza jednej osoby to pojedyncze MB). */
export const MAX_BACKUP_BYTES = 512 * 1024 * 1024
export const BACKUP_EXPORT_EXTENSION = 'sqlite'
export const BACKUP_IMPORT_EXTENSIONS: readonly string[] = ['sqlite', 'db', 'bak']

const pad = (n: number): string => String(n).padStart(2, '0')

/** tracker-backup-RRRR-MM-DD-GGmmss.sqlite — czas lokalny, bez ':' (zakazany w nazwach Windows). */
export function backupFileName(now: Date): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `tracker-backup-${date}-${time}.${BACKUP_EXPORT_EXTENSION}`
}

/** `<baza>.pre-import.<znacznik>.bak` — ten sam styl znacznika co kopie startowe (backupDbFile). */
export function snapshotFileName(dbBase: string, now: Date): string {
  return `${dbBase}.pre-import.${now.toISOString().replace(/[:.]/g, '-')}.bak`
}

export type SchemaPlan =
  | { ok: true; pending: number }
  | { ok: false; code: 'not-tracker' | 'too-new' | 'unknown-schema' }

/**
 * Czy kopię o poziomach `backup` da się podnieść migracjami aplikacji (`app`, rosnąco).
 * Poziom kopii musi być prefiksem poziomów aplikacji — drizzle porównuje tylko ostatni
 * wpis, więc luka albo poziom z innej gałęzi zostałby po cichu pominięty.
 */
export function planSchemaLevel(backup: readonly number[], app: readonly number[]): SchemaPlan {
  if (backup.length === 0) return { ok: false, code: 'not-tracker' }
  for (let i = 1; i < backup.length; i++) {
    if (!(backup[i] > backup[i - 1])) return { ok: false, code: 'unknown-schema' }
  }
  const appMax = app.length > 0 ? app[app.length - 1] : -Infinity
  if (backup[backup.length - 1] > appMax) return { ok: false, code: 'too-new' }
  if (backup.length > app.length || backup.some((level, i) => level !== app[i])) {
    return { ok: false, code: 'unknown-schema' }
  }
  return { ok: true, pending: app.length - backup.length }
}
