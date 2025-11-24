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
autoUpdater.autoDownload = true;
const { log, consoleLog, clearLogs } = require('./utils/logger');
autoUpdater.logger = log;

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

    mainWindow.once('ready-to-show', () => {
        autoUpdater.checkForUpdates();
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.on('check-updates', async (event) => {
    const sender = event.sender;

    // Setup listeners for this update session
    const onLog = (msg) => {
        sender.send('log', msg);
        consoleLog.info(msg);
    };
    const onProgress = (data) => sender.send('progress', data);
    const onError = (msg) => {
        sender.send('error', msg);
        consoleLog.error(msg);
    };

    gameUpdater.on('log', onLog);
    gameUpdater.on('progress', onProgress);
    gameUpdater.on('error', onError);

    try {
        sender.send('status', 'Buscando Actualizaciones');
        sender.send('log', 'Buscando actualizaciones...');

        // Try to import settings from TLauncher if this is a fresh install
        await importSettings(gameUpdater.gameRoot, sender);

        await gameUpdater.checkAndDownloadUpdates();

        sender.send('update-complete');
        sender.send('status', 'Listo');
    } catch (error) {
        console.error(error);
        sender.send('error', error.message);
    } finally {
        // Cleanup listeners to avoid memory leaks or duplicate events
        gameUpdater.off('log', onLog);
        gameUpdater.off('progress', onProgress);
        gameUpdater.off('error', onError);
    }
});

ipcMain.on('launch-game', async (event, { username, mode, memory }) => {
    const sender = event.sender;

    // Helper for logging
    const logToConsole = (msg) => {
        sender.send('log', msg);
        consoleLog.info(msg);
    };

    try {
        let auth = null;

        if (mode === 'microsoft') {
            sender.send('status', 'Iniciando Sesión');
            logToConsole('Iniciando sesión con Microsoft...');
            auth = await loginMicrosoft(sender);
            logToConsole(`Sesión iniciada como: ${auth.name}`);
        }

        sender.send('status', 'Iniciando');
        logToConsole('Iniciando juego...');

        // Launch Game (updates are assumed to be done)
        // We pass a custom logger object to capture internal launcher logs if possible,
        // but launchGame mainly uses sender.send.
        // For now, we just log the high-level steps here.
        await launchGame(username, sender, auth, memory, (msg) => consoleLog.info(msg));

        sender.send('status', 'Jugando');
    } catch (error) {
        console.error(error);
        sender.send('error', error.message);
        consoleLog.error(error.message);
    }
});

// AutoUpdater Events
autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('log', 'Buscando actualizaciones del launcher...');
});

autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
        mainWindow.webContents.send('log', `Actualización disponible: v${info.version}`);
        mainWindow.webContents.send('launcher-update-available');
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

ipcMain.on('start-launcher-update', () => {
    // Auto-download is enabled, so we don't need to manually trigger it.
    // But we can log that the UI requested it (though it should be automatic now)
    if (mainWindow) mainWindow.webContents.send('log', 'Descarga automática en progreso...');
});

ipcMain.on('install-launcher-update', () => {
    autoUpdater.quitAndInstall();
});
