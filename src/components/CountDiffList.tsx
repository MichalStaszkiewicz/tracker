export interface CountDiffRow {
  key: string
  label: string
  /** Etykieta maszynowa (np. surowa nazwa tabeli) — mono. */
  mono: boolean
  current: number
  incoming: number
}

interface Props {
  headers: { label: string; current: string; incoming: string }
  rows: CountDiffRow[]
}

/** Tabela liczności „teraz → po zmianie”; wiersze, w których liczba się zmienia, są wyróżnione. */
export function CountDiffList({ headers, rows }: Props) {
  return (
    <div className="countdiff" role="table">
      <div className="countdiff__row" role="row">
        <span className="countdiff__head" role="columnheader">
          {headers.label}
        </span>
        <span className="countdiff__head countdiff__num" role="columnheader">
          {headers.current}
        </span>
        <span className="countdiff__head countdiff__num" role="columnheader">
          {headers.incoming}
        </span>
      </div>
      {rows.map((r) => (
        <div
          key={r.key}
          className={`countdiff__row${r.current !== r.incoming ? ' countdiff__row--changed' : ''}`}
          role="row"
        >
          <span className={`countdiff__label${r.mono ? ' countdiff__label--mono' : ''}`} role="cell">
            {r.label}
          </span>
          <span className="countdiff__num" role="cell">
            {r.current}
          </span>
          <span className="countdiff__num" role="cell">
            {r.incoming}
          </span>
        </div>
      ))}
    </div>
  )
}
