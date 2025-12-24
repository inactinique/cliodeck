import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { setupIPCHandlers } from './ipc/handlers.js';
import { configManager } from './services/config-manager.js';
import { pdfService } from './services/pdf-service.js';

// Obtenir __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, '../../preload/index.js');
  console.log('📂 __dirname:', __dirname);
  console.log('📂 Preload path:', preloadPath);
  console.log('📂 Preload exists:', existsSync(preloadPath));

  const iconPath = path.join(__dirname, '../../../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // En dev : charger depuis Vite
  // En production : charger depuis dist
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../../dist/renderer/index.html'));
    mainWindow.webContents.openDevTools(); // Temporaire pour debug
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Initialiser configManager (async pour electron-store ES module)
  console.log('🔧 Initializing configManager...');
  await configManager.init();
  console.log('✅ configManager initialized');

  // Note: pdfService is now project-scoped and initialized on-demand
  // via IPC handlers when a project is loaded (not at app startup)

  // Setup IPC handlers
  setupIPCHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
