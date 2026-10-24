import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type TrackerApi } from '@shared/ipc'

const api: TrackerApi = {
  window: {
    minimize: () => ipcRenderer.send(IPC.windowMinimize),
    maximize: () => ipcRenderer.send(IPC.windowMaximize),
    close: () => ipcRenderer.send(IPC.windowClose)
  },
  areas: {
    list: () => ipcRenderer.invoke(IPC.areasList),
    create: (name, color) => ipcRenderer.invoke(IPC.areasCreate, name, color)
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
    quickAdd: (line, ctx) => ipcRenderer.invoke(IPC.entryQuickAdd, line, ctx),
    parents: () => ipcRenderer.invoke(IPC.entryParents),
    search: (q) => ipcRenderer.invoke(IPC.entrySearch, q),
    setStage: (id, stageId) => ipcRenderer.invoke(IPC.entrySetStage, id, stageId),
    setType: (id, typeId) => ipcRenderer.invoke(IPC.entrySetType, id, typeId),
    move: (id, targetId, placement, patch) => ipcRenderer.invoke(IPC.entryMove, id, targetId, placement, patch),
    detail: (id) => ipcRenderer.invoke(IPC.entryDetail, id),
    update: (id, patch) => ipcRenderer.invoke(IPC.entryUpdate, id, patch),
    addTag: (id, group, name) => ipcRenderer.invoke(IPC.entryAddTag, id, group, name),
    removeTag: (id, tagId) => ipcRenderer.invoke(IPC.entryRemoveTag, id, tagId),
    addLink: (id, kind, label, target) => ipcRenderer.invoke(IPC.linkAdd, id, kind, label, target),
    updateLink: (linkId, patch) => ipcRenderer.invoke(IPC.linkUpdate, linkId, patch),
    removeLink: (linkId) => ipcRenderer.invoke(IPC.linkRemove, linkId)
  },
  sessions: {
    active: () => ipcRenderer.invoke(IPC.sessionActive),
    start: (entryId) => ipcRenderer.invoke(IPC.sessionStart, entryId),
    stop: () => ipcRenderer.invoke(IPC.sessionStop),
    switch: (entryId, pausedGroupId) => ipcRenderer.invoke(IPC.sessionSwitch, entryId, pausedGroupId),
    pause: () => ipcRenderer.invoke(IPC.sessionPause),
    resume: (groupId) => ipcRenderer.invoke(IPC.sessionResume, groupId),
    group: (groupId) => ipcRenderer.invoke(IPC.sessionGroup, groupId)
  },
  stats: {
    get: (period) => ipcRenderer.invoke(IPC.statsGet, period)
  },
  offers: {
    list: () => ipcRenderer.invoke(IPC.offersList),
    preview: (offers) => ipcRenderer.invoke(IPC.offersPreview, offers),
    commit: (offers) => ipcRenderer.invoke(IPC.offersCommit, offers),
    scrape: (source, criteria) => ipcRenderer.invoke(IPC.offersScrape, source, criteria)
  },
  backup: {
    status: () => ipcRenderer.invoke(IPC.backupStatus),
    export: (text) => ipcRenderer.invoke(IPC.backupExport, text),
    pick: (text) => ipcRenderer.invoke(IPC.backupPick, text),
    restore: (token) => ipcRenderer.invoke(IPC.backupRestore, token),
    discard: (token) => ipcRenderer.send(IPC.backupDiscard, token),
    dismissNotice: () => ipcRenderer.send(IPC.backupDismissNotice)
  },
  settings: {
    getAll: () => ipcRenderer.invoke(IPC.settingsGetAll),
    set: (key, value) => ipcRenderer.invoke(IPC.settingsSet, key, value)
  },
  system: {
    dbPath: () => ipcRenderer.invoke(IPC.dbPath),
    openDbFolder: () => ipcRenderer.send(IPC.dbOpenFolder),
    openExternal: (url) => ipcRenderer.send(IPC.externalOpen, url),
    openPath: (path) => ipcRenderer.send(IPC.openPath, path),
    onPaletteToggle: (cb) => {
      const handler = () => cb()
      ipcRenderer.on(IPC.paletteToggle, handler)
      return () => ipcRenderer.removeListener(IPC.paletteToggle, handler)
    }
  }
}

contextBridge.exposeInMainWorld('tracker', api)
