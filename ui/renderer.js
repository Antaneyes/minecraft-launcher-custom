const { ipcRenderer } = require('electron');

const launchBtn = document.getElementById('launch-btn');
const usernameInput = document.getElementById('username');
const consoleOutput = document.getElementById('console-output');
const progressBar = document.getElementById('progress-bar');
const statusBadge = document.getElementById('status-badge');
const btnText = document.querySelector('.btn-text');

function log(message) {
    const p = document.createElement('p');
    p.className = 'log-line';
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    consoleOutput.appendChild(p);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

launchBtn.addEventListener('click', () => {
    const username = usernameInput.value;
    if (!username) {
        log('Error: Username is required.');
        return;
    }

    launchBtn.disabled = true;
    btnText.textContent = 'LAUNCHING...';
    
    // Send launch request to main process
    ipcRenderer.send('launch-game', { username });
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
    if (status === 'Ready') {
        launchBtn.disabled = false;
        btnText.textContent = 'PLAY';
        progressBar.style.width = '0%';
    } else if (status === 'Playing') {
        btnText.textContent = 'PLAYING';
    }
});

ipcRenderer.on('error', (event, error) => {
    log(`Error: ${error}`);
    statusBadge.textContent = 'Error';
    launchBtn.disabled = false;
    btnText.textContent = 'PLAY';
    progressBar.style.width = '0%';
});
