// Definicja i rozwiązywanie skrótów. Czyste, izomorficzne.

export type ShortcutAction =
  | 'quickAdd'
  | 'addArea'
  | 'session'
  | 'screen.tasks'
  | 'screen.offers'
  | 'screen.stats'
// Ukryte ekrany (inbox, board) — do rozwinięcia później.

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
  quickAdd: 'ctrl+shift+space',
  addArea: 'ctrl+shift+a',
  session: 'ctrl+t',
  'screen.tasks': 'ctrl+1',
  'screen.offers': 'ctrl+2',
  'screen.stats': 'ctrl+3'
}

export const SHORTCUT_ACTIONS = Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]

/** Nakłada nadpisania użytkownika na domyślne (nieznane akcje ignoruje). */
export function resolveShortcuts(overrides: Record<string, string>): Record<ShortcutAction, string> {
  const out = { ...DEFAULT_SHORTCUTS }
  for (const action of SHORTCUT_ACTIONS) {
    const combo = overrides[action]
    if (combo) out[action] = combo
  }
  return out
}

/** Ładny zapis combo do wyświetlenia: 'ctrl+shift+space' → 'Ctrl ⇧ Space'. */
export function formatCombo(combo: string): string {
  return combo
    .split('+')
    .map((part) => {
      if (part === 'ctrl') return 'Ctrl'
      if (part === 'shift') return '⇧'
      if (part === 'alt') return 'Alt'
      if (part === 'space') return 'Space'
      if (part.startsWith('arrow')) return { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→' }[part] ?? part
      return part.length === 1 ? part.toUpperCase() : part
    })
    .join(' ')
}
