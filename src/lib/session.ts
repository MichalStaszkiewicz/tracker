/** Czysta logika licznika sesji. Bez React, bez api. */

import { secondsSince } from './format'

/**
 * Sekundy na liczniku widżetu: odcinki sprzed pauzy (`carried`) + bieżący odcinek.
 * W pauzie (brak startedAt) licznik stoi na `carried`.
 */
export function sessionElapsed(startedAt: string | null, carried: number, now: Date = new Date()): number {
  return startedAt ? carried + secondsSince(startedAt, now) : carried
}
