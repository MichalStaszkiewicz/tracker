import { useState } from 'react'
import { AreaBars } from '@/components/AreaBars'
import { Card } from '@/components/Card'
import { Heatmap } from '@/components/Heatmap'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SegmentedControl } from '@/components/SegmentedControl'
import { StatTile } from '@/components/StatTile'
import { useStats } from '@/hooks/useStats'
import { useT } from '@/i18n'
import { formatDuration } from '@/lib/format'
import type { StatsPeriod } from '@shared/types'

export function Stats() {
  const { t } = useT()
  const [period, setPeriod] = useState<StatsPeriod>('week')
  const stats = useStats(period)

  return (
    <div className="screen stats">
      <ScreenHeader
        eyebrow={t(`period.${period}`)}
        title={t('nav.stats')}
        actions={
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            options={[
              { key: 'week', label: t('period.week') },
              { key: 'month', label: t('period.month') },
              { key: 'year', label: t('period.year') }
            ]}
          />
        }
      />

      <div className="stats__tiles">
        <StatTile
          icon="flame"
          label={t('stat.streak')}
          value={String(stats.streakDays)}
          sub={t('stat.perDay', { n: stats.thresholdMinutes })}
        />
        <StatTile icon="hourglass" label={t('stat.time')} value={formatDuration(stats.periodMinutes * 60)} />
        <StatTile
          icon="timer"
          label={t('stat.sessions')}
          value={String(stats.sessionCount)}
          sub={t('stat.avg', { n: stats.avgSessionMinutes })}
        />
        <StatTile icon="notebook" label={t('stat.retro')} value="0" sub={t('soon')} />
      </div>

      <div className="stats__grid">
        <div className="stats__col">
          <Card label={t('stats.activity')}>
            <Heatmap data={stats.heatmap} />
          </Card>
          <Card label={t('stats.areaTime')}>
            {stats.areaTime.length > 0 ? (
              <AreaBars items={stats.areaTime} />
            ) : (
              <p className="stats__pending">—</p>
            )}
          </Card>
        </div>
        <Card label={t('stats.toPractice')}>
          <p className="stats__pending">{t('stats.retroPending')}</p>
        </Card>
      </div>
    </div>
  )
}
