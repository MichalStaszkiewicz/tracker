import type { BackupErrorCode, BackupFailure } from '@shared/types'

/** Typowany błąd kopii zapasowej — kod trafia do UI, detal jest krótki i bezpieczny. */
export class BackupError extends Error {
  constructor(
    readonly code: BackupErrorCode,
    readonly detail?: string
  ) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'BackupError'
  }
}

const MAX_DETAIL = 80

function errCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('code' in err)) return undefined
  const code = (err as { code: unknown }).code
  return typeof code === 'string' ? code : undefined
}

/** Błąd systemu plików → kod kopii (ENOSPC → no-space, EACCES/EPERM/EBUSY → no-access, reszta → fallback). */
export function fsFailureCode(err: unknown, fallback: BackupErrorCode): BackupErrorCode {
  const code = errCode(err)
  if (code === 'ENOSPC' || code === 'SQLITE_FULL') return 'no-space'
  if (code === 'EACCES' || code === 'EPERM' || code === 'EBUSY' || code === 'SQLITE_CANTOPEN' || code === 'SQLITE_READONLY') {
    return 'no-access'
  }
  return fallback
}

/** Błąd SQLite przy otwieraniu/sprawdzaniu cudzego pliku → not-sqlite / corrupt, inne → null. */
export function sqliteFailureCode(err: unknown): 'not-sqlite' | 'corrupt' | null {
  const code = errCode(err)
  if (code === 'SQLITE_NOTADB') return 'not-sqlite'
  if (code?.startsWith('SQLITE_CORRUPT')) return 'corrupt'
  return null
}

/** Normalizacja na granicy IPC: BackupError → kod + przycięty detal; inny błąd → kod zapasowy bez treści. */
export function toBackupFailure(err: unknown, fallback: BackupErrorCode): BackupFailure {
  if (err instanceof BackupError) {
    return err.detail === undefined
      ? { status: 'error', code: err.code }
      : { status: 'error', code: err.code, detail: err.detail.slice(0, MAX_DETAIL) }
  }
  return { status: 'error', code: fallback }
}
