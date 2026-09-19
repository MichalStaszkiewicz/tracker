import { formatDuration } from '@/lib/format'

interface Props {
  items: { name: string; color: string | null; minutes: number }[]
}

export function AreaBars({ items }: Props) {
  const max = Math.max(1, ...items.map((i) => i.minutes))
  return (
    <div className="areabars">
      {items.map((it, i) => (
        <div className="areabar" key={i}>
          <span className="areabar__name">{it.name}</span>
          <span className="areabar__track">
            <span
              className="areabar__fill"
              style={{ width: `${(it.minutes / max) * 100}%`, background: it.color ?? 'var(--color-neutral-600)' }}
            />
          </span>
          <span className="areabar__val">{formatDuration(it.minutes * 60)}</span>
        </div>
      ))}
    </div>
  )
}
