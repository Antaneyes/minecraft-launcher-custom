const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";
const { checkAndDownloadUpdates } = require('./utils/updater');
const { launchGame } = require('./utils/launcher');
const { loginMicrosoft } = require('./utils/auth');

let mainWindow;

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
    try {
        sender.send('status', 'Buscando Actualizaciones');
        sender.send('log', 'Buscando actualizaciones...');

        await checkAndDownloadUpdates(sender);

        sender.send('update-complete');
        sender.send('status', 'Listo');
    } catch (error) {
        console.error(error);
        sender.send('error', error.message);
    }
});

ipcMain.on('launch-game', async (event, { username, mode, memory }) => {
    const sender = event.sender;

    try {
        let auth = null;

        if (mode === 'microsoft') {
            sender.send('status', 'Iniciando Sesión');
            sender.send('log', 'Iniciando sesión con Microsoft...');
            auth = await loginMicrosoft(sender);
            sender.send('log', `Sesión iniciada como: ${auth.name}`);
        }

        sender.send('status', 'Iniciando');
        sender.send('log', 'Iniciando juego...');

        // Launch Game (updates are assumed to be done)
        await launchGame(username, sender, auth, memory);

        sender.send('status', 'Jugando');

    } catch (error) {
        console.error(error);
        sender.send('error', error.message);
    }
});
