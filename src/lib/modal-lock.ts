// Otwarty modal blokuje globalne skróty (np. Ctrl+T w trakcie przywracania kopii) —
// licznik, bo modale mogą się nakładać. Czyste, bez Reacta.

let depth = 0

/** Zajmuje blokadę; zwraca funkcję zwalniającą (idempotentną). */
export function acquireModalLock(): () => void {
  depth += 1
  let released = false
  return () => {
    if (released) return
    released = true
    depth = Math.max(0, depth - 1)
  }
}

export function isModalLocked(): boolean {
  return depth > 0
}
