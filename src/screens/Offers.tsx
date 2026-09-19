import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ImportModal } from '@/components/ImportModal'
import { Menu } from '@/components/Menu'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useOffers } from '@/hooks/useOffers'
import { useT } from '@/i18n'
import { shortDate } from '@/lib/format'
import { salaryValue } from '@/lib/salary'

type Sort = 'added' | 'salary'

export function Offers({ onOpenEntry }: { onOpenEntry?: (id: number) => void }) {
  const { t } = useT()
  const { offers, refetch } = useOffers()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('added')
  const [importing, setImporting] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? offers.filter((o) => `${o.company} ${o.position} ${o.location} ${o.source}`.toLowerCase().includes(q))
      : offers
    return [...filtered].sort((a, b) =>
      sort === 'salary'
        ? salaryValue(b.salary) - salaryValue(a.salary)
        : a.createdAt < b.createdAt
          ? 1
          : -1
    )
  }, [offers, query, sort])

  return (
    <div className="screen">
      <ScreenHeader
        eyebrow={t('offers.eyebrow', { count: offers.length })}
        title={t('nav.offers')}
        actions={
          <button className="btn btn--accent" onClick={() => setImporting(true)}>
            <Icon name="note" size={13} />
            {t('offers.import')}
          </button>
        }
      />

      <div className="filterbar">
        <span className="filterbar__searchbox">
          <Icon name="magnifying-glass" size={12} />
          <input value={query} placeholder={t('offers.search')} onChange={(e) => setQuery(e.currentTarget.value)} />
        </span>
        <span className="filterbar__spacer" />
        <Menu
          align="right"
          trigger={
            <span className="filterbar__grouplabel">
              {t(sort === 'added' ? 'offers.sortAdded' : 'offers.sortSalary')}
            </span>
          }
          items={[
            { key: 'added', label: t('offers.sortAdded') },
            { key: 'salary', label: t('offers.sortSalary') }
          ]}
          activeKey={sort}
          onSelect={(k) => setSort(k as Sort)}
        />
      </div>

      <div className="otable">
        <div className="otable__head">
          <span>{t('col.company')}</span>
          <span>{t('col.position')}</span>
          <span>{t('col.salary')}</span>
          <span>{t('col.mode')}</span>
          <span>{t('col.location')}</span>
          <span>{t('col.source')}</span>
          <span>{t('col.added')}</span>
        </div>
        <div className="otable__body">
          {rows.map((o) => (
            <button className="otable__row" key={o.id} onClick={() => onOpenEntry?.(o.id)}>
              <span className="otable__company">{o.company || '—'}</span>
              <span className="otable__pos">{o.position}</span>
              <span className="otable__mono">{o.salary || '—'}</span>
              <span className="otable__mono otable__dim">{o.workMode || '—'}</span>
              <span className="otable__mono otable__dim">{o.location || '—'}</span>
              <span className="otable__mono otable__dim">{o.source || '—'}</span>
              <span className="otable__mono otable__dim">{o.createdAt ? shortDate(o.createdAt.slice(0, 10)) : ''}</span>
            </button>
          ))}
          {rows.length === 0 && <div className="otable__empty">{t('offers.empty')}</div>}
        </div>
      </div>

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImported={() => {
            setImporting(false)
            void refetch()
          }}
        />
      )}
    </div>
  )
}
