const fs = require('fs-extra');
const path = require('path');

const manifestPath = path.join(__dirname, 'manifest.json');
const noModsPath = path.join(__dirname, 'manifest_nomods.json');

async function run() {
    try {
        const manifest = await fs.readJson(manifestPath);

        // Filter out mods
        manifest.files = manifest.files.filter(f => !f.path.startsWith('mods/'));

        await fs.writeJson(noModsPath, manifest, { spaces: 4 });
        console.log('Created manifest_nomods.json');
    } catch (e) {
        console.error(e);
    }
}

run();
