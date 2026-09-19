import { useRef, useState } from 'react'
import { api } from '@/api'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import { autoMapColumns, parseCsv, type OfferField } from '@shared/csv'
import type { ImportOffer, ImportPreview } from '@shared/types'
import { Icon } from './Icon'
import { Menu, type MenuItem } from './Menu'

const FIELDS: OfferField[] = ['company', 'position', 'salary', 'workMode', 'location', 'url']
const FIELD_KEY: Record<OfferField, StringKey> = {
  company: 'col.company',
  position: 'col.position',
  salary: 'col.salary',
  workMode: 'col.mode',
  location: 'col.location',
  url: 'col.source'
}

function buildOffers(rows: Record<string, string>[], map: Record<string, OfferField | ''>): ImportOffer[] {
  return rows.map((r) => {
    const o: ImportOffer = {}
    for (const [header, field] of Object.entries(map)) {
      if (field && r[header]) o[field] = r[header]
    }
    return o
  })
}

interface Props {
  onClose: () => void
  onImported: (count: number) => void
}

export function ImportModal({ onClose, onImported }: Props) {
  const { t } = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, OfferField | ''>>({})
  const [offers, setOffers] = useState<ImportOffer[]>([])
  const [preview, setPreview] = useState<ImportPreview | null>(null)

  const fieldLabel = (field: OfferField | ''): string =>
    field === '' ? t('imp.skip') : field === 'url' ? 'URL' : t(FIELD_KEY[field])

  const recompute = async (r: Record<string, string>[], map: Record<string, OfferField | ''>) => {
    const built = buildOffers(r, map)
    setOffers(built)
    setPreview(await api.offers.preview(built))
  }

  const onFile = async (file: File) => {
    const text = await file.text()
    const parsed = parseCsv(text)
    const map = autoMapColumns(parsed.headers)
    setFileName(file.name)
    setRows(parsed.rows)
    setHeaders(parsed.headers)
    setMapping(map)
    await recompute(parsed.rows, map)
  }

  const remap = async (header: string, field: OfferField | '') => {
    const map = { ...mapping, [header]: field }
    setMapping(map)
    await recompute(rows, map)
  }

  const doImport = async () => {
    const res = await api.offers.commit(offers)
    onImported(res.imported)
  }

  const menuItems: MenuItem[] = [
    { key: '', label: t('imp.skip') },
    ...FIELDS.map((f) => ({ key: f, label: fieldLabel(f) }))
  ]

  return (
    <div className="palette__backdrop" onMouseDown={onClose}>
      <div className="importmodal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="importmodal__head">
          <Icon name="note" size={16} />
          <span className="importmodal__title">{t('imp.title')}</span>
          {fileName && (
            <span className="importmodal__file">
              {fileName}
              <span className="importmodal__filemeta"> · {rows.length}</span>
            </span>
          )}
          <button className="iconbtn" style={{ marginLeft: 'auto' }} aria-label="esc" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="importmodal__body">
          {!fileName ? (
            <button className="importmodal__drop" onClick={() => fileRef.current?.click()}>
              <Icon name="folder-open" size={22} />
              {t('imp.pick')}
            </button>
          ) : (
            <>
              <div className="importmodal__section">
                <div className="importmodal__label">{t('imp.mapping')}</div>
                <div className="importmodal__map">
                  {headers.map((h) => (
                    <div className="maprow" key={h}>
                      <span className="maprow__src">{h}</span>
                      <Icon name="arrow-up-right" size={11} />
                      <Menu
                        trigger={<span>{fieldLabel(mapping[h] ?? '')}</span>}
                        items={menuItems}
                        activeKey={mapping[h] ?? ''}
                        onSelect={(k) => void remap(h, k as OfferField | '')}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {preview && (
                <>
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
                        {preview.newItems.slice(0, 5).map((o, i) => (
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
            disabled={!preview || preview.newItems.length === 0}
            onClick={() => void doImport()}
          >
            {t('imp.importN', { n: preview?.newItems.length ?? 0 })}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0]
            if (f) void onFile(f)
          }}
        />
      </div>
    </div>
  )
}
