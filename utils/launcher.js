const { Client, Authenticator } = require('minecraft-launcher-core');
const { GAME_ROOT } = require('./updater');
const launcher = new Client();

async function launchGame(username, sender) {
    // For this example, we use offline mode / simple auth
    // In production, you'd use Microsoft Auth:
    // const auth = await Authenticator.getAuth("microsoft");

    const opts = {
        clientPackage: null,
        // Simply using the latest release for demo purposes. 
        // You can specify '1.20.1', '1.12.2', etc.
        // Or read it from the manifest!
        version: {
            number: "1.20.1",
            type: "release"
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
            max: "4G",
            min: "2G"
        }
    };

    sender.send('log', `Launching Minecraft ${opts.version.number}...`);

    launcher.on('debug', (e) => sender.send('log', `[MC Debug] ${e}`));
    launcher.on('data', (e) => sender.send('log', `[MC Output] ${e}`));

    // Progress of game files downloading (assets, jar, etc.)
    launcher.on('progress', (e) => {
        sender.send('progress', { current: e.task, total: e.total, type: 'game-download' });
    });

    await launcher.launch(opts);
}

module.exports = { launchGame };
