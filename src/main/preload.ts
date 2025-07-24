import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (data: any) => ipcRenderer.invoke('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),
  saveSettings: (data: any) => ipcRenderer.invoke('save-settings', data),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
})