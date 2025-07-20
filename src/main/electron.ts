import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load Vite dev server in development, or built file in production
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load Vite dev server:', err);
    });
  } else {
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html')).catch((err) => {
      console.error('Failed to load index.html:', err);
    });
  }
}

app.whenReady().then(createWindow).catch((err) => {
  console.error('Failed to initialize Electron app:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Data persistence
const dataFile = path.join(app.getPath('userData'), 'data.json');
const settingsFile = path.join(app.getPath('userData'), 'settings.json');

ipcMain.handle('save-data', async (_event, data) => {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Failed to save data:', err);
    return false;
  }
});

ipcMain.handle('load-data', async () => {
  try {
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    }
    return null;
  } catch (err) {
    console.error('Failed to load data:', err);
    return null;
  }
});

ipcMain.handle('save-settings', async (_event, data) => {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return false;
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    if (fs.existsSync(settingsFile)) {
      return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    }
    return null;
  } catch (err) {
    console.error('Failed to load settings:', err);
    return null;
  }
});