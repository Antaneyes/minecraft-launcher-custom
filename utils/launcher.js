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
    const versionNumber = manifest.gameVersion || "1.20.1";
    const versionType = manifest.versionType || "release"; // 'release' or 'custom'

    // For Fabric, the versionNumber should be the folder name of the fabric version
    // e.g., "fabric-loader-0.14.22-1.20.1"

    const opts = {
        clientPackage: null,
        version: {
            number: versionNumber,
            type: versionType
        },
        root: GAME_ROOT,
        authorization: {
            access_token: "token",
            client_token: "token",
            uuid: "uuid",
            name: username,
            user_properties: "{}",
            meta: {
                type: "mojang",
                demo: false
            }
        },
        memory: {
            max: manifest.maxMemory || "4G",
            min: manifest.minMemory || "2G"
        }
    };

    sender.send('log', `Launching Minecraft ${opts.version.number} (${opts.version.type})...`);

    launcher.on('debug', (e) => sender.send('log', `[MC Debug] ${e}`));
    launcher.on('data', (e) => sender.send('log', `[MC Output] ${e}`));

    // Progress of game files downloading (assets, jar, etc.)
    launcher.on('progress', (e) => {
        sender.send('progress', { current: e.task, total: e.total, type: 'game-download' });
    });

    await launcher.launch(opts);
}

module.exports = { launchGame };
