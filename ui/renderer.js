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

// Set Version dynamically
try {
    const packageJson = require('../package.json');
    document.getElementById('version-text').textContent = `v${packageJson.version}`;
} catch (e) {
    console.error('Error loading version:', e);
}

// Settings Logic
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const ramSlider = document.getElementById('ram-slider');
const ramValue = document.getElementById('ram-value');

// Load saved RAM
const savedRam = localStorage.getItem('savedRam') || '4';
ramSlider.value = savedRam;
ramValue.textContent = `${savedRam} GB`;

settingsBtn.addEventListener('click', () => {
    settingsOverlay.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsOverlay.classList.add('hidden');
});

ramSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    ramValue.textContent = `${val} GB`;
    localStorage.setItem('savedRam', val);
});

// Close settings on outside click
settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
        settingsOverlay.classList.add('hidden');
    }
});

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
    consoleContainer.classList.toggle('visible');
    // Optional: Change icon or state if needed
});

const closeConsoleBtn = document.getElementById('close-console-btn');
if (closeConsoleBtn) {
    closeConsoleBtn.addEventListener('click', () => {
        consoleContainer.classList.remove('visible');
    });
}

// Close console when clicking outside (optional, but nice for overlays)
document.addEventListener('click', (e) => {
    if (consoleContainer.classList.contains('visible') &&
        !consoleContainer.contains(e.target) &&
        !toggleConsoleBtn.contains(e.target)) {
        consoleContainer.classList.remove('visible');
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
    const memory = localStorage.getItem('savedRam') || '4';
    ipcRenderer.send('launch-game', { username, mode: loginMode, memory: `${memory}G` });
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
