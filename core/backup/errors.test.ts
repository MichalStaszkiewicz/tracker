import { describe, expect, it } from 'vitest'
import { BackupError, fsFailureCode, sqliteFailureCode, toBackupFailure } from './errors'

const withCode = (code: string): Error => Object.assign(new Error('x'), { code })

describe('toBackupFailure', () => {
  it('BackupError przechodzi z kodem i detalem (≤80 znaków)', () => {
    expect(toBackupFailure(new BackupError('too-new', '2.0.0'), 'read-failed')).toEqual({
      status: 'error',
      code: 'too-new',
      detail: '2.0.0'
    })
    const long = toBackupFailure(new BackupError('invalid-json', 'x'.repeat(200)), 'read-failed')
    expect(long.detail).toHaveLength(80)
    expect(toBackupFailure(new BackupError('busy'), 'read-failed')).toEqual({ status: 'error', code: 'busy' })
  })

  it('inny błąd → kod zapasowy bez treści (SQL i ścieżki nie wyciekają do UI)', () => {
    const f = toBackupFailure(new Error('SQLITE_ERROR near "x": C:\\Users\\secret'), 'restore-failed')
    expect(f).toEqual({ status: 'error', code: 'restore-failed' })
    expect(toBackupFailure('string', 'write-failed')).toEqual({ status: 'error', code: 'write-failed' })
  })
})

describe('fsFailureCode', () => {
  it('ENOSPC → no-space; EACCES/EPERM/EBUSY → no-access; reszta → fallback', () => {
    expect(fsFailureCode(withCode('ENOSPC'), 'write-failed')).toBe('no-space')
    expect(fsFailureCode(withCode('SQLITE_FULL'), 'write-failed')).toBe('no-space')
    for (const c of ['EACCES', 'EPERM', 'EBUSY', 'SQLITE_CANTOPEN', 'SQLITE_READONLY']) {
      expect(fsFailureCode(withCode(c), 'write-failed')).toBe('no-access')
    }
    expect(fsFailureCode(withCode('ENOENT'), 'write-failed')).toBe('write-failed')
    expect(fsFailureCode(new Error('x'), 'read-failed')).toBe('read-failed')
    expect(fsFailureCode(null, 'read-failed')).toBe('read-failed')
  })
})

describe('sqliteFailureCode', () => {
  it('SQLITE_NOTADB → not-sqlite; SQLITE_CORRUPT* → corrupt; inne → null', () => {
    expect(sqliteFailureCode(withCode('SQLITE_NOTADB'))).toBe('not-sqlite')
    expect(sqliteFailureCode(withCode('SQLITE_CORRUPT'))).toBe('corrupt')
    expect(sqliteFailureCode(withCode('SQLITE_CORRUPT_INDEX'))).toBe('corrupt')
    expect(sqliteFailureCode(withCode('SQLITE_BUSY'))).toBeNull()
    expect(sqliteFailureCode(new Error('x'))).toBeNull()
  })
})
