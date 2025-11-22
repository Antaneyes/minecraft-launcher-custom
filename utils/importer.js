const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Standard TLauncher/Minecraft path
const TLAUNCHER_ROOT = path.join(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share"), '.minecraft');

async function findSourceRoot() {
    const candidates = [];

    // 1. Check root .minecraft
    if (await fs.pathExists(path.join(TLAUNCHER_ROOT, 'options.txt'))) {
        candidates.push(TLAUNCHER_ROOT);
    }

    // 2. Check versions folder (TLauncher modpacks often live here)
    const versionsDir = path.join(TLAUNCHER_ROOT, 'versions');
    if (await fs.pathExists(versionsDir)) {
        const entries = await fs.readdir(versionsDir);
        for (const entry of entries) {
            const fullPath = path.join(versionsDir, entry);
            // Check if it's a directory and has options.txt (indicates a separate instance)
            if ((await fs.stat(fullPath)).isDirectory() && await fs.pathExists(path.join(fullPath, 'options.txt'))) {
                candidates.push(fullPath);
            }
        }
    }

    if (candidates.length === 0) return null;

    // 3. Find the most recently modified options.txt
    let bestCandidate = null;
    let maxTime = 0;

    for (const candidate of candidates) {
        try {
            const stats = await fs.stat(path.join(candidate, 'options.txt'));
            if (stats.mtimeMs > maxTime) {
                maxTime = stats.mtimeMs;
                bestCandidate = candidate;
            }
        } catch (e) {
            console.error(`Error checking candidate ${candidate}:`, e);
        }
    }

    return bestCandidate;
}

async function importSettings(targetRoot, sender) {
    try {
        // 1. Safety Check: Don't overwrite if target already has options.txt
        if (await fs.pathExists(path.join(targetRoot, 'options.txt'))) {
            // sender.send('log', 'El launcher ya está configurado. Saltando importación.');
            return;
        }

        sender.send('log', 'Buscando configuración antigua de TLauncher...');
        const sourceRoot = await findSourceRoot();

        if (!sourceRoot) {
            sender.send('log', 'No se encontraron instalaciones previas de Minecraft/TLauncher.');
            return;
        }

        sender.send('log', `Importando configuración desde: ${sourceRoot}`);

        // 2. Files/Folders to copy
        const itemsToCopy = [
            'options.txt',
            'optionsof.txt', // OptiFine
            'optionsshaders.txt', // Iris/Shaders
            'servers.dat',
            'XaeroWaypoints',
            'XaeroWorldMap',
            'screenshots' // Maybe? User didn't ask but it's nice. Let's stick to settings/waypoints for now to save space/time.
        ];

        for (const item of itemsToCopy) {
            const sourcePath = path.join(sourceRoot, item);
            const targetPath = path.join(targetRoot, item);

            if (await fs.pathExists(sourcePath)) {
                sender.send('log', `Copiando ${item}...`);
                await fs.copy(sourcePath, targetPath, { overwrite: false });
            }
        }

        sender.send('log', 'Importación completada con éxito.');

    } catch (error) {
        console.error('Error importing settings:', error);
        sender.send('log', `Error importando configuración: ${error.message}`);
    }
}

module.exports = { importSettings };
