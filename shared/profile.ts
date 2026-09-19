export interface ProfileLink {
  id: string
  kind: string // klucz serwisu: linkedin | x | github | discord | pwn | web
  label: string
  url: string
}

export interface ProfileData {
  name: string
  headline: string
  bio: string
  location: string
  email: string
  links: ProfileLink[]
}

export const DEFAULT_PROFILE: ProfileData = {
  name: '',
  headline: '',
  bio: '',
  location: '',
  email: '',
  links: []
}

/** Inicjały z nazwy: „Marek K." → „MK". Czyste. */
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const letters = parts.slice(0, 2).map((p) => p[0].toUpperCase())
  return letters.join('')
}
