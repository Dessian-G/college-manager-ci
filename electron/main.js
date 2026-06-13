const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV !== 'production' && !process.env.ELECTRON_PACKAGED

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'default',
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (isDev) mainWindow.webContents.openDevTools()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Initialiser la base de données
  try {
    const { initDatabase } = require('./database/db')
    initDatabase()
    console.log('✅ Base de données initialisée')
  } catch (err) {
    console.error('❌ Erreur init DB:', err.message)
    console.error(err.stack)
  }

  // Enregistrer les handlers IPC
  try {
    require('./ipc/handlers')
    console.log('✅ Handlers IPC enregistrés')
  } catch (err) {
    console.error('❌ Erreur handlers IPC:', err.message)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC de test — Phase 0
ipcMain.handle('ping', () => 'pong')

ipcMain.handle('app:getVersion', () => app.getVersion())

ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})

ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

ipcMain.handle('shell:openPath', async (_, filePath) => {
  await shell.openPath(filePath)
})

ipcMain.handle('app:getDataPath', () => {
  return app.getPath('userData')
})
