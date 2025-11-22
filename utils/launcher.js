const fs = require('fs-extra');
const path = require('path');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { GAME_ROOT } = require('./updater');
const launcher = new Client();

async function launchGame(username, sender, auth = null) {
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
        authorization: auth || Promise.resolve(token),
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
            detached: false,
            checkFiles: true,
            checkHash: true
        }
    };

    // Verify the file exists in the standard location, but DO NOT pass 'custom' path to opts.
    // MCLC should find it automatically at versions/{number}/{number}.json
    if (versionType === 'custom') {
        const standardPath = path.join(GAME_ROOT, 'versions', gameVersion, `${gameVersion}.json`);
        sender.send('log', `Buscando JSON personalizado en ruta estándar: ${standardPath}`);

        if (fs.existsSync(standardPath)) {
            sender.send('log', `Archivo existe: true. Dejando que MCLC lo encuentre automáticamente.`);
            // We do NOT set opts.version.custom here.
        } else {
            sender.send('log', `ADVERTENCIA: Archivo JSON personalizado NO encontrado en: ${standardPath}`);
        }
    }

    // Helper to safely send IPC messages
    const safeSend = (channel, ...args) => {
        if (!sender.isDestroyed()) {
            sender.send(channel, ...args);
        }
    };

    sender.send('log', `Lanzando Minecraft ${gameVersion} (${versionType})...`);
    sender.send('log', `Opciones de lanzamiento: ${JSON.stringify(opts, null, 2)}`);

    // Progress of game files downloading (assets, jar, etc.)
    launcher.on('progress', (e) => {
        safeSend('progress', { current: e.task, total: e.total, type: 'game-download' });
    });

    launcher.on('debug', (e) => {
        safeSend('log', `[MC Debug] ${e}`);
        fs.appendFileSync(path.join(GAME_ROOT, 'debug_log.txt'), e + '\n');
        if (e.includes('Launching with arguments')) {
            fs.writeFileSync(path.join(GAME_ROOT, 'launch_cmd.txt'), e);
        }
    });
    launcher.on('data', (e) => safeSend('log', `[MC Salida] ${e}`));
    launcher.on('error', (e) => {
        safeSend('log', `[MC Error] ${e}`);
        safeSend('launch-error', e.message);
    });
    launcher.on('close', (e) => {
        safeSend('log', `[MC Cerrado] ${e}`);
        safeSend('launch-close', e);
    });

    await fs.writeJson(path.join(GAME_ROOT, 'launch_args.json'), opts, { spaces: 4 });
    await launcher.launch(opts);
}

module.exports = { launchGame };
