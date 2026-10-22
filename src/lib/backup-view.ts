import type { TFn } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import type { BackupDialogText, BackupErrorCode, Lang, LastExport, RestorePreview } from '@shared/types'
import { formatDateTime } from './format'

// Czyste przekształcenia danych kopii zapasowej na teksty i wiersze widoku.

/** Wyczerpujące — nowy kod błędu bez tekstu to błąd kompilacji. */
export const BACKUP_ERROR_KEY: Record<BackupErrorCode, StringKey> = {
  busy: 'bk.err.busy',
  'is-live-db': 'bk.err.is-live-db',
  'too-large': 'bk.err.too-large',
  'read-failed': 'bk.err.read-failed',
  'not-sqlite': 'bk.err.not-sqlite',
  corrupt: 'bk.err.corrupt',
  'not-tracker': 'bk.err.not-tracker',
  'too-new': 'bk.err.too-new',
  'unknown-schema': 'bk.err.unknown-schema',
  'migration-failed': 'bk.err.migration-failed',
  'broken-references': 'bk.err.broken-references',
  'invalid-json': 'bk.err.invalid-json',
  'no-entry-types': 'bk.err.no-entry-types',
  'no-space': 'bk.err.no-space',
  'no-access': 'bk.err.no-access',
  'write-failed': 'bk.err.write-failed',
  expired: 'bk.err.expired',
  'snapshot-failed': 'bk.err.snapshot-failed',
  'restore-failed': 'bk.err.restore-failed'
}

export function errorText(f: { code: BackupErrorCode; detail?: string }, t: TFn): string {
  const message = t(BACKUP_ERROR_KEY[f.code])
  return f.detail ? t('bk.err.withDetail', { message, detail: f.detail }) : message
}

/** Kolejność tabel w podglądzie — najpierw to, co użytkownik rozpoznaje. */
export const TABLE_ORDER: readonly string[] = [
  'entries',
  'areas',
  'entry_types',
  'stages',
  'tags',
  'entry_tags',
  'links',
  'sessions',
  'retros',
  'retro_skills',
  'settings'
]

export const TABLE_LABELS: Partial<Record<string, StringKey>> = {
  entries: 'bk.table.entries',
  areas: 'bk.table.areas',
  entry_types: 'bk.table.entry_types',
  stages: 'bk.table.stages',
  tags: 'bk.table.tags',
  entry_tags: 'bk.table.entry_tags',
  links: 'bk.table.links',
  sessions: 'bk.table.sessions',
  retros: 'bk.table.retros',
  retro_skills: 'bk.table.retro_skills',
  settings: 'bk.table.settings'
}

export interface DiffRow {
  key: string
  label: string
  mono: boolean
  current: number
  incoming: number
}

/** Wiersze „teraz → w kopii”: znane tabele w TABLE_ORDER z etykietą, nieznane alfabetycznie z surową nazwą. */
export function diffRows(p: RestorePreview, t: TFn): DiffRow[] {
  const rank = (table: string): number => {
    const i = TABLE_ORDER.indexOf(table)
    return i < 0 ? TABLE_ORDER.length : i
  }
  return [...p.tables]
    .sort((a, b) => rank(a.table) - rank(b.table) || a.table.localeCompare(b.table))
    .map(({ table, current, incoming }) => {
      const key = TABLE_LABELS[table]
      return { key: table, label: key ? t(key) : table, mono: !key, current, incoming }
    })
}

/** Linia „skąd jest ten plik” w podglądzie przywracania. */
export function metaLine(p: RestorePreview, t: TFn, lang: Lang): string {
  const date = formatDateTime(p.takenAt, lang)
  if (p.origin === 'pre-import') return t('bk.meta.snapshot', { date })
  if (p.origin === 'raw') return t('bk.meta.raw', { date })
  return t('bk.meta.export', { date, version: p.appVersion ?? '?' })
}

/** Teksty natywnego okna zapisu/otwierania (proces główny nie ma tłumaczeń). */
export function dialogText(t: TFn, kind: 'export' | 'import'): BackupDialogText {
  return kind === 'export'
    ? {
        title: t('bk.dlg.exportTitle'),
        buttonLabel: t('bk.dlg.exportButton'),
        filterName: t('bk.dlg.filter'),
        allFilesName: t('bk.dlg.allFiles')
      }
    : {
        title: t('bk.dlg.importTitle'),
        buttonLabel: t('bk.dlg.importButton'),
        filterName: t('bk.dlg.filter'),
        allFilesName: t('bk.dlg.allFiles')
      }
}

/** Przywrócenie zakończy trwającą (w bazie) albo wstrzymaną (w rendererze) sesję. */
export function sessionWillEnd(p: RestorePreview, pausedInRenderer: boolean): boolean {
  return p.liveOpenSessions > 0 || pausedInRenderer
}

/** Opis wiersza eksportu: ostatni eksport (data · ścieżka) albo opis domyślny. */
export function exportDesc(last: LastExport | null, t: TFn, lang: Lang): string {
  return last
    ? t('set.backupExport.last', { date: formatDateTime(last.at, lang), path: last.path })
    : t('set.backupExport.desc')
}
