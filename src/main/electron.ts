import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Data persistence
const dataFile = path.join(app.getPath('userData'), 'data.json')
const settingsFile = path.join(app.getPath('userData'), 'settings.json')

ipcMain.handle('save-data', async (_event, data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data))
  return true
})

ipcMain.handle('load-data', async () => {
  if (fs.existsSync(dataFile)) {
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
  }
  return null
})

ipcMain.handle('save-settings', async (_event, data) => {
  fs.writeFileSync(settingsFile, JSON.stringify(data))
  return true
})

ipcMain.handle('load-settings', async () => {
  if (fs.existsSync(settingsFile)) {
    return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
  }
  return null
})