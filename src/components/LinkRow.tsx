import { Icon } from './Icon'

interface Props {
  icon: string
  label: string
  url: string
  onOpen: () => void
}

export function LinkRow({ icon, label, url, onOpen }: Props) {
  return (
    <button className="linkrow" onClick={onOpen}>
      <Icon name={icon} size={17} />
      <span className="linkrow__label">{label}</span>
      <span className="linkrow__url">{url}</span>
      <Icon name="arrow-up-right" size={13} />
    </button>
  )
}
