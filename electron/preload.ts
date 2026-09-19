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
  tasks: {
    list: (filter) => ipcRenderer.invoke(IPC.tasksList, filter)
  },
  entries: {
    toggleDone: (id) => ipcRenderer.invoke(IPC.entryToggleDone, id),
    quickAdd: (line) => ipcRenderer.invoke(IPC.entryQuickAdd, line)
  },
  sessions: {
    active: () => ipcRenderer.invoke(IPC.sessionActive),
    start: (entryId) => ipcRenderer.invoke(IPC.sessionStart, entryId),
    stop: () => ipcRenderer.invoke(IPC.sessionStop)
  }
}

contextBridge.exposeInMainWorld('tracker', api)
