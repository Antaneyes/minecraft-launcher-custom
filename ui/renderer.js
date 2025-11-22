const { ipcRenderer } = require('electron');

const launchBtn = document.getElementById('launch-btn');
const usernameInput = document.getElementById('username');
const consoleOutput = document.getElementById('console-output');
const progressBar = document.getElementById('progress-bar');
const statusBadge = document.getElementById('status-badge');
const btnText = document.querySelector('.btn-text');

// Load saved username
const savedUsername = localStorage.getItem('savedUsername');
if (savedUsername) {
    usernameInput.value = savedUsername;
}

function log(message) {
    const p = document.createElement('p');
    p.className = 'log-line';
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    consoleOutput.appendChild(p);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

document.getElementById('copy-logs-btn').addEventListener('click', () => {
    const logs = consoleOutput.innerText;
    navigator.clipboard.writeText(logs).then(() => {
        const btn = document.getElementById('copy-logs-btn');
        const originalText = btn.textContent;
        btn.textContent = '¡Copiado!';
        setTimeout(() => btn.textContent = originalText, 2000);
    }).catch(err => {
        console.error('Error al copiar logs:', err);
    });
});

const toggleConsoleBtn = document.getElementById('toggle-console-btn');
const consoleContainer = document.getElementById('console-container');

toggleConsoleBtn.addEventListener('click', () => {
    consoleContainer.classList.toggle('hidden');
    if (consoleContainer.classList.contains('hidden')) {
        toggleConsoleBtn.textContent = 'Mostrar Consola ▼';
    } else {
        toggleConsoleBtn.textContent = 'Ocultar Consola ▲';
    }
});

const modeOfflineBtn = document.getElementById('mode-offline');
const modeMicrosoftBtn = document.getElementById('mode-microsoft');
const offlineInputContainer = document.getElementById('offline-input-container');
const microsoftInfo = document.getElementById('microsoft-info');

let loginMode = 'offline';

modeOfflineBtn.addEventListener('click', () => {
    loginMode = 'offline';
    modeOfflineBtn.classList.add('active');
    modeMicrosoftBtn.classList.remove('active');
    offlineInputContainer.classList.remove('hidden');
    microsoftInfo.classList.add('hidden');
    launchBtn.querySelector('.btn-text').textContent = 'JUGAR';
});

modeMicrosoftBtn.addEventListener('click', () => {
    loginMode = 'microsoft';
    modeMicrosoftBtn.classList.add('active');
    modeOfflineBtn.classList.remove('active');
    offlineInputContainer.classList.add('hidden');
    microsoftInfo.classList.remove('hidden');
    launchBtn.querySelector('.btn-text').textContent = 'INICIAR SESIÓN Y JUGAR';
});

launchBtn.addEventListener('click', () => {
    const username = usernameInput.value;

    if (loginMode === 'offline' && !username) {
        log('Error: El nombre de usuario es obligatorio.');
        return;
    }

    if (loginMode === 'offline') {
        // Save username only in offline mode
        localStorage.setItem('savedUsername', username);
    }

    launchBtn.disabled = true;
    btnText.textContent = loginMode === 'microsoft' ? 'INICIANDO SESIÓN...' : 'INICIANDO...';

    // Send launch request to main process
    ipcRenderer.send('launch-game', { username, mode: loginMode });
});

ipcRenderer.on('log', (event, message) => {
    log(message);
});

ipcRenderer.on('progress', (event, { current, total, type }) => {
    // type can be 'update' or 'game-download'
    const percentage = Math.min(100, Math.max(0, (current / total) * 100));
    progressBar.style.width = `${percentage}%`;
});

ipcRenderer.on('status', (event, status) => {
    statusBadge.textContent = status;
    if (status === 'Listo') {
        launchBtn.disabled = false;
        btnText.textContent = 'JUGAR';
        progressBar.style.width = '0%';
    } else if (status === 'Jugando') {
        btnText.textContent = 'JUGANDO';
    }
});

ipcRenderer.on('error', (event, error) => {
    log(`Error: ${error}`);
    statusBadge.textContent = 'Error';
    launchBtn.disabled = false;
    btnText.textContent = 'JUGAR';
    progressBar.style.width = '0%';
});

ipcRenderer.on('launch-close', (event) => {
    log('Juego cerrado.');
    statusBadge.textContent = 'Listo';
    launchBtn.disabled = false;
    btnText.textContent = 'JUGAR';
    progressBar.style.width = '0%';
});

ipcRenderer.on('update-complete', () => {
    launchBtn.disabled = false;
    btnText.textContent = 'JUGAR';
});

ipcRenderer.on('launcher-update-available', (event, url) => {
    const updateBtn = document.getElementById('update-launcher-btn');
    updateBtn.classList.remove('hidden');
    updateBtn.onclick = () => {
        require('electron').shell.openExternal(url);
    };
    log('¡Nueva versión del launcher disponible! Haz clic en el botón amarillo para descargarla.');
});

// Start updates immediately
launchBtn.disabled = true;
btnText.textContent = 'ACTUALIZANDO...';
ipcRenderer.send('check-updates');
