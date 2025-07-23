const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('fs').promises

const DATA_FILE = path.join(app.getPath('userData'), 'sheetData.json')
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')

function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Disable default menu to allow AG Grid context menu
  Menu.setApplicationMenu(null)

  mainWindow.loadFile('index.html')
  mainWindow.webContents.openDevTools() // Keep DevTools open for debugging

  // Debug context-menu events
  mainWindow.webContents.on('context-menu', (event, params) => {
    console.log('Main process context-menu event:', params)
  })
}

app.whenReady().then(() => {
  // Handle save-data
  ipcMain.handle('save-data', async (event, data) => {
    try {
      console.log('Saving data to file:', data)
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
      return true
    } catch (error) {
      console.error('Error saving data:', error)
      return false
    }
  })

  // Handle load-data
  ipcMain.handle('load-data', async () => {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8')
      console.log('Loaded data from file:', JSON.parse(data))
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading data:', error)
      return {}
    }
  })

  // Handle save-settings
  ipcMain.handle('save-settings', async (event, data) => {
    try {
      console.log('Saving settings to file:', data)
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2))
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      return false
    }
  })

  // Handle load-settings
  ipcMain.handle('load-settings', async () => {
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf8')
      console.log('Loaded settings from file:', JSON.parse(data))
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading settings:', error)
      return { exchangeRate: '7.79' }
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})