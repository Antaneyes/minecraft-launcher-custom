const fs = require('fs-extra');
const path = require('path');
const { Client } = require('minecraft-launcher-core');
const { GAME_ROOT } = require('./updater');
const launcher = new Client();

async function launchGame(username, sender) {
    // Load configuration from the manifest we just downloaded
    let manifest = {};
    try {
        manifest = await fs.readJson(path.join(GAME_ROOT, 'client-manifest.json'));
    } catch (e) {
        sender.send('log', 'Warning: No manifest found. Using defaults.');
    }

    // Default to 1.20.1 if not specified
    const gameVersion = manifest.gameVersion || "1.20.1";
    const versionType = manifest.versionType || "release"; // 'release' or 'custom'
    const maxMemory = manifest.maxMemory || "4G";
    const minMemory = manifest.minMemory || "2G";

    // Authorization (offline mode for now, or passed username)
    const token = {
        access_token: "token",
        client_token: "token",
        uuid: "uuid",
        name: username,
        user_properties: "{}",
        meta: {
            type: "mojang",
            demo: false
        }
    };

    const opts = {
        clientPackage: null,
        authorization: Promise.resolve(token),
        root: GAME_ROOT,
        version: {
            number: gameVersion,
            type: versionType
        },
        memory: {
            max: maxMemory,
            min: minMemory
        },
        overrides: {
            detached: false
        }
    };

    // Verify the file exists in the standard location, but DO NOT pass 'custom' path to opts.
    // MCLC should find it automatically at versions/{number}/{number}.json
    if (versionType === 'custom') {
        const standardPath = path.join(GAME_ROOT, 'versions', gameVersion, `${gameVersion}.json`);
        sender.send('log', `Checking for custom JSON at standard path: ${standardPath}`);

        if (fs.existsSync(standardPath)) {
            sender.send('log', `File exists: true. Letting MCLC find it automatically.`);
            // We do NOT set opts.version.custom here.
        } else {
            sender.send('log', `WARNING: Custom JSON file NOT found at: ${standardPath}`);
        }
    }

    sender.send('log', `Launching Minecraft ${gameVersion} (${versionType})...`);
    sender.send('log', `Launch options: ${JSON.stringify(opts, null, 2)}`);

    // Progress of game files downloading (assets, jar, etc.)
    launcher.on('progress', (e) => {
        sender.send('progress', { current: e.task, total: e.total, type: 'game-download' });
    });

    launcher.on('debug', (e) => sender.send('log', `[MC Debug] ${e}`));
    launcher.on('data', (e) => sender.send('log', `[MC Output] ${e}`));
    launcher.on('error', (e) => {
        sender.send('log', `[MC Error] ${e}`);
        sender.send('launch-error', e.message);
    });
    launcher.on('close', (e) => {
        sender.send('log', `[MC Close] ${e}`);
        sender.send('launch-close', e);
    });

    await launcher.launch(opts);
}

module.exports = { launchGame };
