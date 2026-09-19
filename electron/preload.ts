import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type TrackerApi } from '@shared/ipc'

const api: TrackerApi = {
  window: {
    minimize: () => ipcRenderer.send(IPC.windowMinimize),
    maximize: () => ipcRenderer.send(IPC.windowMaximize),
    close: () => ipcRenderer.send(IPC.windowClose)
  },
  areas: {
    list: () => ipcRenderer.invoke(IPC.areasList)
  },
  types: {
    list: () => ipcRenderer.invoke(IPC.typesList)
  },
  tags: {
    list: () => ipcRenderer.invoke(IPC.tagsList)
  },
  tasks: {
    list: (filter) => ipcRenderer.invoke(IPC.tasksList, filter)
  },
  board: {
    types: () => ipcRenderer.invoke(IPC.boardTypes),
    view: (typeId) => ipcRenderer.invoke(IPC.boardView, typeId)
  },
  entries: {
    toggleDone: (id) => ipcRenderer.invoke(IPC.entryToggleDone, id),
    quickAdd: (line) => ipcRenderer.invoke(IPC.entryQuickAdd, line),
    parents: () => ipcRenderer.invoke(IPC.entryParents),
    setStage: (id, stageId) => ipcRenderer.invoke(IPC.entrySetStage, id, stageId)
  },
  sessions: {
    active: () => ipcRenderer.invoke(IPC.sessionActive),
    start: (entryId) => ipcRenderer.invoke(IPC.sessionStart, entryId),
    stop: () => ipcRenderer.invoke(IPC.sessionStop)
  },
  stats: {
    get: (period) => ipcRenderer.invoke(IPC.statsGet, period)
  },
  settings: {
    getAll: () => ipcRenderer.invoke(IPC.settingsGetAll),
    set: (key, value) => ipcRenderer.invoke(IPC.settingsSet, key, value)
  },
  system: {
    dbPath: () => ipcRenderer.invoke(IPC.dbPath),
    openDbFolder: () => ipcRenderer.send(IPC.dbOpenFolder),
    openExternal: (url) => ipcRenderer.send(IPC.externalOpen, url)
  }
}

contextBridge.exposeInMainWorld('tracker', api)
