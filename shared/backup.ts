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

/** Znacznik ISO (UTC) bez ':' i '.' — sortuje się alfabetycznie tak samo jak chronologicznie. */
const stamp = (now: Date): string => now.toISOString().replace(/[:.]/g, '-')
const STAMP_PATTERN = String.raw`\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z`
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Ile najnowszych kopii startowych zostaje w folderze backups. */
export const STARTUP_BACKUPS_KEEP = 20

/** `<baza>.<znacznik>.bak` — kopia przy starcie, przed migracjami. Przywracanie czyta ją jako surowe źródło. */
export function startupBackupFileName(dbBase: string, now: Date): string {
  return `${dbBase}.${stamp(now)}.bak`
}

/** `<baza>.pre-import.<znacznik>.bak` — ten sam styl znacznika co kopie startowe. */
export function snapshotFileName(dbBase: string, now: Date): string {
  return `${dbBase}.pre-import.${stamp(now)}.bak`
}

/** Kopie startowe `dbBase` poza `keep` najnowszymi; inne pliki (np. kopie sprzed przywrócenia) nigdy. */
export function staleStartupBackups(names: readonly string[], dbBase: string, keep: number): string[] {
  const startup = new RegExp(String.raw`^${escapeRegExp(dbBase)}\.${STAMP_PATTERN}\.bak$`)
  return names
    .filter((name) => startup.test(name))
    .sort()
    .reverse()
    .slice(Math.max(0, keep))
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
