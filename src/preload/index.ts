import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

console.log('[preload] loaded. contextIsolated =', process.contextIsolated)

contextBridge.exposeInMainWorld('serial', {
  list: () => ipcRenderer.invoke('serial:list'),
  open: (path: string, baudRate = 115200) => ipcRenderer.invoke('serial:open', { path, baudRate }),
  write: (data: Uint8Array | string) => ipcRenderer.invoke('serial:write', data),
  close: () => ipcRenderer.invoke('serial:close')
})
console.log('[preload] exposed serial?', typeof (globalThis as any).serial !== 'undefined')

const api = {}
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('[preload] expose error', error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
