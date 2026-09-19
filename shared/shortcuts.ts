// Definicja i rozwiązywanie skrótów. Czyste, izomorficzne.

export type ShortcutAction =
  | 'quickAdd'
  | 'session'
  | 'screen.tasks'
  | 'screen.inbox'
  | 'screen.board'
  | 'screen.offers'
  | 'screen.stats'

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
  quickAdd: 'ctrl+shift+space',
  session: 'ctrl+t',
  'screen.tasks': 'ctrl+1',
  'screen.inbox': 'ctrl+2',
  'screen.board': 'ctrl+3',
  'screen.offers': 'ctrl+4',
  'screen.stats': 'ctrl+5'
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
