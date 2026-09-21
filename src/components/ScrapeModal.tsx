import { useEffect, useState } from 'react'
import { api } from '@/api'
import { useT } from '@/i18n'
import type { ImportPreview } from '@shared/types'
import { Icon } from './Icon'

interface Props {
  onClose: () => void
  onImported: (count: number) => void
}

/** Pobiera oferty z JustJoin.it i pokazuje podgląd importu (reużywa styli importu CSV). */
export function ScrapeModal({ onClose, onImported }: Props) {
  const { t } = useT()
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState(false)
  const [importError, setImportError] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    let alive = true
    api.offers
      .scrape('justjoin')
      .then((p) => alive && setPreview(p))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  const doImport = async () => {
    if (!preview) return
    setImporting(true)
    setImportError(false)
    try {
      const res = await api.offers.commit(preview.newItems)
      onImported(res.imported)
    } catch {
      setImporting(false)
      setImportError(true) // porażka zapisu ≠ porażka pobrania — inny komunikat, podgląd zostaje
    }
  }

  const loading = !preview && !error

  return (
    <div className="palette__backdrop" onMouseDown={onClose}>
      <div className="importmodal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="importmodal__head">
          <Icon name="briefcase" size={16} />
          <span className="importmodal__title">{t('scrape.title')}</span>
          <button className="iconbtn" style={{ marginLeft: 'auto' }} aria-label="esc" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="importmodal__body">
          {loading && (
            <div className="scrape__state">
              <Icon name="hourglass" size={20} />
              {t('scrape.loading')}
            </div>
          )}
          {error && (
            <div className="scrape__state scrape__state--err">
              <Icon name="warning-circle" size={18} />
              {t('scrape.error')}
            </div>
          )}
          {preview && !error && (
            <>
              {importError && (
                <div className="scrape__banner">
                  <Icon name="warning-circle" size={14} />
                  {t('scrape.importError')}
                </div>
              )}
              <div className="importmodal__counts">
                <span className="imp-chip imp-chip--new">
                  <Icon name="plus" size={12} />
                  {t('imp.new', { n: preview.newItems.length })}
                </span>
                <span className="imp-chip">
                  <Icon name="arrows-left-right" size={12} />
                  {t('imp.dup', { n: preview.duplicates.length })}
                </span>
                {preview.errors.length > 0 && (
                  <span className="imp-chip imp-chip--err">
                    <Icon name="warning-circle" size={12} />
                    {t('imp.err', { n: preview.errors.length })}
                  </span>
                )}
              </div>

              {preview.newItems.length > 0 && (
                <div className="importmodal__section">
                  <div className="importmodal__label">{t('imp.sample')}</div>
                  <div className="imp-sample">
                    {preview.newItems.slice(0, 6).map((o, i) => (
                      <div className="imp-sample__row" key={i}>
                        <span>{o.company || '—'}</span>
                        <span className="imp-sample__pos">{o.position || '—'}</span>
                        <span className="imp-sample__sal">{o.salary || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="importmodal__foot">
          <span className="importmodal__dedup">{t('imp.dedup')}</span>
          <button className="btn" onClick={onClose}>
            {t('imp.cancel')}
          </button>
          <button
            className="btn btn--accent"
            disabled={!preview || preview.newItems.length === 0 || importing}
            onClick={() => void doImport()}
          >
            {t('imp.importN', { n: preview?.newItems.length ?? 0 })}
          </button>
        </div>
      </div>
    </div>
  )
}
