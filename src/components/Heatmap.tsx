const COLORS = [
  'var(--color-neutral-900)',
  'var(--color-accent-800)',
  'var(--color-accent-600)',
  'var(--color-accent-400)',
  'var(--color-accent-200)'
]

interface Props {
  data: { date: string; minutes: number }[]
}

export function Heatmap({ data }: Props) {
  const max = Math.max(1, ...data.map((d) => d.minutes))
  const level = (m: number): number => {
    if (m <= 0) return 0
    if (m < max * 0.25) return 1
    if (m < max * 0.5) return 2
    if (m < max * 0.75) return 3
    return 4
  }
  return (
    <div className="heatmap">
      {data.map((d) => (
        <span
          key={d.date}
          className="heatmap__cell"
          title={`${d.date} · ${d.minutes} min`}
          style={{ background: COLORS[level(d.minutes)] }}
        />
      ))}
    </div>
  )
}
