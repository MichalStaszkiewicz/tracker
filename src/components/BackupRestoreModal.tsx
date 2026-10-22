import { useT } from '@/i18n'
import type { RestoreFlow } from '@/hooks/useBackup'
import { diffRows, errorText, metaLine } from '@/lib/backup-view'
import { formatDateTime } from '@/lib/format'
import { CountDiffList } from './CountDiffList'
import { Icon } from './Icon'
import { ModalShell } from './ModalShell'

interface Props {
  flow: Exclude<RestoreFlow, { phase: 'idle' }>
  sessionWillEnd: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Podgląd przywracania: skąd jest plik, co się zmieni, ostrzeżenia, potwierdzenie. */
export function BackupRestoreModal({ flow, sessionWillEnd, onConfirm, onCancel }: Props) {
  const { t, lang } = useT()
  const { preview } = flow
  const restoring = flow.phase === 'restoring'

  const footer =
    flow.phase === 'failed' ? (
      <button className="btn" autoFocus onClick={onCancel}>
        {t('bk.close')}
      </button>
    ) : (
      <>
        <button className="btn" autoFocus disabled={restoring} onClick={onCancel}>
          {t('bk.cancel')}
        </button>
        <button className="btn btn--accent" disabled={restoring} onClick={onConfirm}>
          {restoring ? t('bk.restoring') : t('bk.confirm')}
        </button>
      </>
    )

  return (
    <ModalShell
      icon="clock-counter-clockwise"
      title={t('bk.title')}
      badge={preview.fileName}
      onClose={restoring ? undefined : onCancel}
      closeLabel={t('bk.close')}
      footer={footer}
    >
      <div className="bkmodal__meta">{metaLine(preview, t, lang)}</div>
      {(preview.pendingMigrations > 0 || preview.closedOpenSessions > 0) && (
        <div className="bkmodal__notes">
          {preview.pendingMigrations > 0 && <span>{t('bk.upgrade', { n: preview.pendingMigrations })}</span>}
          {preview.closedOpenSessions > 0 && (
            <span>
              {t('bk.closedSessions', { n: preview.closedOpenSessions, date: formatDateTime(preview.takenAt, lang) })}
            </span>
          )}
        </div>
      )}
      <CountDiffList
        headers={{ label: t('bk.col.data'), current: t('bk.col.current'), incoming: t('bk.col.incoming') }}
        rows={diffRows(preview, t)}
      />
      <div className="bkmodal__notes">
        {sessionWillEnd && <span className="bkmodal__warn">{t('bk.warn.session')}</span>}
        <span>{t('bk.settings')}</span>
        <span>{t('bk.safety')}</span>
      </div>
      {flow.phase === 'failed' && (
        <div className="bkmodal__notes" role="alert">
          <span className="imp-chip imp-chip--err">
            <Icon name="warning-circle" size={12} />
            {errorText(flow.failure, t)}
          </span>
          <span>{t('bk.unchanged')}</span>
        </div>
      )}
    </ModalShell>
  )
}
