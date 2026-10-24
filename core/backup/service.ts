import { copyFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION, MAX_BACKUP_BYTES, planSchemaLevel } from '@shared/backup'
import type { BackupKind, BackupOrigin, RestorePreview } from '@shared/types'
import { createDb, type Connection } from '../db/connection'
import { migrationLevels, runMigrations } from '../db/migrate'
import { jsonColumns } from '../db/schema-info'
import {
  attachSource,
  checkpoint,
  countRows,
  detachSource,
  foreignKeyViolations,
  integrityOk,
  invalidJsonColumns,
  listDataTables,
  readBackupMeta,
  readMigrationLevels,
  replaceAllFrom,
  vacuumInto,
  writeBackupMeta,
  type DataTable
} from '../repositories/backup'
import { openSessionCount, stopSession } from '../repositories/sessions'
import { BackupError, fsFailureCode, sqliteFailureCode } from './errors'
import { isLiveDbFile, readSqliteHeader, removeDbFiles } from './files'

// Orkiestracja kopii: eksport (VACUUM INTO), przygotowanie pliku do przywrócenia (staging + walidacja
// + migracje na prywatnej kopii) i przywrócenie (kopia stanu sprzed + zamiana w jednej transakcji).

export interface ExportMeta {
  appVersion: string
  now: Date
  kind: BackupKind
}

/** Nieoczekiwany błąd → BackupError z kodem zapasowym (pierwotny błąd jako cause, do logu). */
function asBackupError(err: unknown, fallback: () => BackupError['code']): BackupError {
  return err instanceof BackupError ? err : new BackupError(fallback(), undefined, { cause: err })
}

/**
 * Zapisuje spójny zrzut bazy na żywo do `targetPath`: VACUUM INTO do `.partial`, w kopii zamyka
 * trwającą sesję (na `now`) i dopisuje metadane, sprawdza integralność, potem atomowy rename.
 * Baza na żywo nie jest modyfikowana. Przy błędzie `.partial` znika, a stary plik docelowy zostaje.
 */
export function exportBackup(live: Connection, targetPath: string, meta: ExportMeta): void {
  const tmp = `${targetPath}.partial`
  try {
    removeDbFiles(tmp)
    vacuumInto(live.sqlite, tmp)
    const copy = createDb(tmp, { wal: false, foreignKeys: false })
    try {
      stopSession(copy.db, meta.now)
      writeBackupMeta(copy.sqlite, {
        format: BACKUP_FORMAT,
        formatVersion: String(BACKUP_FORMAT_VERSION),
        kind: meta.kind,
        exportedAt: meta.now.toISOString(),
        appVersion: meta.appVersion
      })
      if (!integrityOk(copy.sqlite)) throw new BackupError('write-failed', 'integrity')
    } finally {
      copy.sqlite.close()
    }
    renameSync(tmp, targetPath)
  } catch (err) {
    removeDbFiles(tmp)
    throw asBackupError(err, () => fsFailureCode(err, 'write-failed'))
  }
}

export interface StageContext {
  live: Connection
  liveDbPath: string | null
  stagingDir: string
  migrationsFolder: string
  token: string
  maxBytes?: number
}

export interface StagedBackup {
  stagedPath: string
  preview: RestorePreview
}

/** Pierwsza tabela, której kolumny (nazwa, typ, NOT NULL, pk) się różnią, albo brakująca/nadmiarowa; null = zgodne. */
export function firstStructureDiff(a: readonly DataTable[], b: readonly DataTable[]): string | null {
  const shape = (t: DataTable): string =>
    JSON.stringify(
      [...t.columns]
        .sort((x, y) => x.name.localeCompare(y.name))
        .map((c) => [c.name, c.type.toUpperCase(), c.notNull, c.pk])
    )
  const byName = new Map(b.map((t) => [t.name, t]))
  const names = [...new Set([...a.map((t) => t.name), ...b.map((t) => t.name)])].sort()
  for (const name of names) {
    const ta = a.find((t) => t.name === name)
    const tb = byName.get(name)
    if (!ta || !tb || shape(ta) !== shape(tb)) return name
  }
  return null
}

function validIso(value: string | undefined): string | null {
  return value !== undefined && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null
}

/**
 * Przygotowuje plik do przywrócenia, nie dotykając bazy na żywo (tylko ją czyta):
 * kopia do stagingu (plik użytkownika nigdy nie jest otwierany przez SQLite) → integralność →
 * VACUUM INTO czystej kopii (wchłania -wal) → metadane → poziom schematu → migracje z FK OFF →
 * zgodność struktury z bazą na żywo → FK, JSON, typy wpisów → zamknięcie niezakończonych sesji.
 * Każdy problem to BackupError z własnym kodem; przy błędzie staging jest sprzątany.
 */
export function stageBackup(sourcePath: string, ctx: StageContext): StagedBackup {
  if (isLiveDbFile(sourcePath, ctx.liveDbPath)) throw new BackupError('is-live-db')

  let size: number
  let mtime: Date
  try {
    const st = statSync(sourcePath)
    size = st.size
    mtime = st.mtime
  } catch (err) {
    throw new BackupError('read-failed', undefined, { cause: err })
  }
  if (size > (ctx.maxBytes ?? MAX_BACKUP_BYTES)) throw new BackupError('too-large')

  let header: ReturnType<typeof readSqliteHeader>
  try {
    header = readSqliteHeader(sourcePath)
  } catch (err) {
    throw new BackupError('read-failed', undefined, { cause: err })
  }
  if (!header) throw new BackupError('not-sqlite')
  if (header.pageCount !== null && header.pageSize * header.pageCount > size) throw new BackupError('corrupt')

  const raw = join(ctx.stagingDir, `${ctx.token}.raw`)
  const staged = join(ctx.stagingDir, `${ctx.token}.sqlite`)
  const open: Connection[] = []
  const close = (c: Connection): void => {
    const i = open.indexOf(c)
    if (i >= 0) open.splice(i, 1)
    c.sqlite.close()
  }
  try {
    try {
      mkdirSync(ctx.stagingDir, { recursive: true })
      copyFileSync(sourcePath, raw)
      if (existsSync(`${sourcePath}-wal`)) copyFileSync(`${sourcePath}-wal`, `${raw}-wal`)
    } catch (err) {
      throw new BackupError(fsFailureCode(err, 'read-failed'), undefined, { cause: err })
    }

    try {
      const rawConn = createDb(raw, { wal: false, foreignKeys: false })
      open.push(rawConn)
      if (!integrityOk(rawConn.sqlite)) throw new BackupError('corrupt')
      vacuumInto(rawConn.sqlite, staged)
      close(rawConn)
    } catch (err) {
      throw asBackupError(err, () => sqliteFailureCode(err) ?? 'corrupt')
    }
    removeDbFiles(raw)

    const st = createDb(staged, { wal: false, foreignKeys: false })
    open.push(st)

    const meta = readBackupMeta(st.sqlite)
    if (meta) {
      if (meta.format !== BACKUP_FORMAT) throw new BackupError('not-tracker')
      const version = Number(meta.formatVersion)
      if (!Number.isInteger(version) || version < 1) throw new BackupError('not-tracker')
      if (version > BACKUP_FORMAT_VERSION) throw new BackupError('too-new', meta.appVersion)
    }
    const origin: BackupOrigin = meta ? (meta.kind === 'pre-import' ? 'pre-import' : 'export') : 'raw'
    const takenAt = validIso(meta?.exportedAt) ?? mtime.toISOString()

    const levels = readMigrationLevels(st.sqlite)
    if (!levels) throw new BackupError('not-tracker')
    const plan = planSchemaLevel(levels, migrationLevels(ctx.migrationsFolder))
    if (!plan.ok) throw new BackupError(plan.code, plan.code === 'too-new' ? meta?.appVersion : undefined)

    try {
      runMigrations(st.db, ctx.migrationsFolder) // FK wyłączone: migracje mogą przebudowywać tabele-rodziców
    } catch (err) {
      throw new BackupError('migration-failed', undefined, { cause: err })
    }

    const incomingTables = listDataTables(st.sqlite)
    const liveTables = listDataTables(ctx.live.sqlite)
    const diff = firstStructureDiff(incomingTables, liveTables)
    if (diff) throw new BackupError('not-tracker', diff)

    const fk = foreignKeyViolations(st.sqlite)
    if (fk > 0) throw new BackupError('broken-references', String(fk))
    const badJson = invalidJsonColumns(st.sqlite, jsonColumns())
    if (badJson.length > 0) throw new BackupError('invalid-json', badJson[0])
    const incoming = countRows(st.sqlite, incomingTables)
    if (!incoming.entry_types) throw new BackupError('no-entry-types')

    const closedOpenSessions = openSessionCount(st.db)
    if (closedOpenSessions > 0) stopSession(st.db, new Date(takenAt))

    const current = countRows(ctx.live.sqlite, liveTables)
    const preview: RestorePreview = {
      token: ctx.token,
      fileName: basename(sourcePath),
      origin,
      takenAt,
      appVersion: meta?.appVersion ?? null,
      pendingMigrations: plan.pending,
      closedOpenSessions,
      liveOpenSessions: openSessionCount(ctx.live.db),
      tables: liveTables.map((t) => ({ table: t.name, current: current[t.name] ?? 0, incoming: incoming[t.name] ?? 0 }))
    }
    close(st)
    return { stagedPath: staged, preview }
  } catch (err) {
    for (const c of open.splice(0)) c.sqlite.close()
    removeDbFiles(raw)
    removeDbFiles(staged)
    throw asBackupError(err, () => sqliteFailureCode(err) ?? 'read-failed')
  }
}

/**
 * Zastępuje wszystkie dane bazy na żywo zawartością przygotowanego pliku:
 * najpierw kopia obecnego stanu (bez niej nic się nie zmienia), potem ATTACH, ponowna kontrola
 * struktury i zamiana w jednej transakcji; na końcu DETACH i checkpoint WAL.
 */
export function restoreStaged(
  live: Connection,
  stagedPath: string,
  snapshot: { path: string; meta: ExportMeta }
): void {
  if (!existsSync(stagedPath)) throw new BackupError('expired')

  try {
    mkdirSync(dirname(snapshot.path), { recursive: true })
    exportBackup(live, snapshot.path, snapshot.meta)
  } catch (err) {
    throw new BackupError('snapshot-failed', undefined, { cause: err })
  }

  try {
    detachSource(live.sqlite) // pozostałość po przerwanym przywracaniu
    attachSource(live.sqlite, stagedPath)
    const liveTables = listDataTables(live.sqlite, 'main')
    const diff = firstStructureDiff(listDataTables(live.sqlite, 'bak_src'), liveTables)
    if (diff) throw new BackupError('restore-failed', `structure:${diff}`)
    replaceAllFrom(live.sqlite, liveTables)
  } catch (err) {
    throw asBackupError(err, () => 'restore-failed')
  } finally {
    detachSource(live.sqlite)
  }
  checkpoint(live.sqlite)
}
