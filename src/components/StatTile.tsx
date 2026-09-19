import { Icon } from './Icon'

interface Props {
  icon: string
  label: string
  value: string
  sub?: string
}

export function StatTile({ icon, label, value, sub }: Props) {
  return (
    <div className="stat">
      <div className="stat__head">
        <Icon name={icon} size={13} />
        <span>{label}</span>
      </div>
      <div className="stat__value">{value}</div>
      {sub && <div className="stat__sub">{sub}</div>}
    </div>
  )
}
