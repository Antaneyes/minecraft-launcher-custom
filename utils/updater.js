const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// CONFIGURATION
// The user MUST change this URL to their hosted manifest.json
const UPDATE_URL = 'https://raw.githubusercontent.com/Antaneyes/minecraft-launcher-custom/master/manifest.json';
const GAME_ROOT = path.join(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share"), '.my-custom-server');

async function checkAndDownloadUpdates(sender) {
    try {
        // Ensure game directory exists
        await fs.ensureDir(GAME_ROOT);

        sender.send('log', `Checking updates from: ${UPDATE_URL}`);

        // Fetch manifest
        // In a real scenario, we would wrap this in a try/catch and handle 404s
        let manifest;
        try {
            const response = await axios.get(UPDATE_URL);
            manifest = response.data;
        } catch (e) {
            sender.send('log', 'Could not fetch update manifest. Skipping update check (Offline mode?).');
            return; // Skip updates if server is down
        }

        sender.send('log', `Remote version: ${manifest.version}`);

        // Process files
        if (manifest.files && Array.isArray(manifest.files)) {
            // 1. CLEANUP PHASE: Remove old mods
            const modsDir = path.join(GAME_ROOT, 'mods');
            if (await fs.pathExists(modsDir)) {
                const localMods = await fs.readdir(modsDir);
                const manifestModNames = manifest.files
                    .filter(f => f.path.startsWith('mods/'))
                    .map(f => path.basename(f.path));

                for (const file of localMods) {
                    if (!manifestModNames.includes(file)) {
                        sender.send('log', `Removing old mod: ${file}`);
                        await fs.remove(path.join(modsDir, file));
                    }
                }
            }

            // 2. DOWNLOAD PHASE
            let processed = 0;
            const total = manifest.files.length;

            for (const file of manifest.files) {
                const destPath = path.join(GAME_ROOT, file.path);
                const fileUrl = file.url;

                sender.send('log', `Downloading: ${file.path}`);

                const dirName = path.dirname(destPath);
                try {
                    await fs.ensureDir(dirName);
                } catch (err) {
                    sender.send('log', `Error creating dir ${dirName}: ${err.message}`);
                    throw err;
                }

                // Download file
                const writer = fs.createWriteStream(destPath);
                const response = await axios({
                    url: encodeURI(fileUrl),
                    method: 'GET',
                    responseType: 'stream'
                });

                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                processed++;
                sender.send('progress', { current: processed, total: total, type: 'update' });
            }
        }

        sender.send('log', 'All updates downloaded.');

        // Save the manifest locally so the launcher knows what version to play
        await fs.writeJson(path.join(GAME_ROOT, 'client-manifest.json'), manifest);

    } catch (error) {
        throw new Error(`Update failed: ${error.message}`);
    }
}

module.exports = { checkAndDownloadUpdates, GAME_ROOT };
