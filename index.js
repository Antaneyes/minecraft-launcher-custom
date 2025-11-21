const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { checkAndDownloadUpdates } = require('./utils/updater');
const { launchGame } = require('./utils/launcher');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 600,
        frame: true, // Set to false for frameless custom window if desired
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false // For simple IPC in this demo
        },
        backgroundColor: '#121212',
        resizable: false
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
ipcMain.on('launch-game', async (event, { username }) => {
    const sender = event.sender;

    try {
        sender.send('status', 'Checking Updates');
        sender.send('log', 'Checking for updates...');

        // 1. Check for updates
        await checkAndDownloadUpdates(sender);

        sender.send('status', 'Launching');
        sender.send('log', 'Starting game...');

        // 2. Launch Game
        await launchGame(username, sender);

        sender.send('status', 'Playing');

        // Optional: Close launcher when game starts
        // mainWindow.close();

    } catch (error) {
        console.error(error);
        sender.send('error', error.message);
    }
});
