/** Czysta zamiana zdarzenia klawiatury na napis combo, np. "ctrl+shift+space". */
export interface KeyLike {
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
  key: string
}

export function comboFromEvent(e: KeyLike): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('ctrl')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  let key = e.key.toLowerCase()
  if (key === ' ' || key === 'spacebar') key = 'space'
  parts.push(key)
  return parts.join('+')
}
