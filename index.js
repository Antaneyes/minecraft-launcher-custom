const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Parse command line arguments
const args = process.argv.slice(1);
const gameDirArgIndex = args.indexOf('--game-dir');
if (gameDirArgIndex !== -1 && args[gameDirArgIndex + 1]) {
    process.env.OMBICRAFT_GAME_ROOT = args[gameDirArgIndex + 1];
    console.log(`Custom game directory set to: ${process.env.OMBICRAFT_GAME_ROOT}`);
}

// Configure autoUpdater
autoUpdater.autoDownload = false;
const { log, consoleLog, clearLogs } = require('./utils/logger');
autoUpdater.logger = log;

// ... (existing code) ...

ipcMain.on('start-launcher-update', () => {
    if (mainWindow) mainWindow.webContents.send('log', 'Iniciando descarga de actualización...');
    autoUpdater.downloadUpdate();
});

// Ensure we start with a fresh log file each time
clearLogs();

// In development, write logs to project directory for easier access
if (!app.isPackaged) {
    // Already handled in logger.js default config, but we can override if needed
    // log.transports.file.resolvePathFn = ...
}

const GameUpdater = require('./utils/GameUpdater');
const { launchGame } = require('./utils/launcher');
const { loginMicrosoft } = require('./utils/auth');
const { importSettings } = require('./utils/importer');

let mainWindow;

// Initialize GameUpdater
const gameUpdater = new GameUpdater();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 750,
        minWidth: 800,
        minHeight: 600,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#121212',
        resizable: true
    });

    mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
    mainWindow.removeMenu();

    mainWindow.once('ready-to-show', async () => {
        const channel = await gameUpdater.getChannel();
        autoUpdater.allowPrerelease = (channel === 'beta');
        log(`Configurando AutoUpdater: Canal=${channel}, AllowPrerelease=${autoUpdater.allowPrerelease}`);
        autoUpdater.checkForUpdates();
    });
}

// ...

autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
        mainWindow.webContents.send('log', `Actualización disponible: v${info.version}`);
        mainWindow.webContents.send('launcher-update-available', info.version);
    }
});

autoUpdater.on('update-not-available', () => {
    if (mainWindow) mainWindow.webContents.send('log', 'El launcher está actualizado.');
});

autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('log', `Error en auto-update: ${err}`);
});

autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
        mainWindow.webContents.send('launcher-download-progress', progressObj.percent);
    }
});

autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
        mainWindow.webContents.send('log', 'Actualización descargada. Lista para instalar.');
        mainWindow.webContents.send('launcher-update-ready');
    }
});



ipcMain.on('install-launcher-update', () => {
    autoUpdater.quitAndInstall();
});
