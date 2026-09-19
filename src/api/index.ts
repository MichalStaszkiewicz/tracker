import type { TrackerApi } from '@shared/ipc'

// Jedyny szew UI ↔ dane. Renderer woła wyłącznie to, nigdy IPC wprost.
export const api: TrackerApi = window.tracker
