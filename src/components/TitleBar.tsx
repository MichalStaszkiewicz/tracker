import { api } from '@/api'
import { Icon } from './Icon'

export function TitleBar() {
  return (
    <div className="titlebar">
      <span className="titlebar__brand">tracker</span>
      <span className="titlebar__search">
        <Icon name="magnifying-glass" size={11} />
        Ctrl K
      </span>
      <span className="titlebar__win">
        <button className="winbtn" onClick={() => api.window.minimize()} aria-label="Minimalizuj">
          <Icon name="minus" size={12} />
        </button>
        <button className="winbtn" onClick={() => api.window.maximize()} aria-label="Maksymalizuj">
          <Icon name="square" size={10} />
        </button>
        <button className="winbtn winbtn--close" onClick={() => api.window.close()} aria-label="Zamknij">
          <Icon name="x" size={12} />
        </button>
      </span>
    </div>
  )
}
