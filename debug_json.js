const fs = require('fs-extra');
const path = require('path');

const GAME_ROOT = path.join(process.env.APPDATA, '.my-custom-server');
const jsonPath = path.join(GAME_ROOT, 'versions', 'fabric-loader-0.17.2-1.21.9', 'fabric-loader-0.17.2-1.21.9.json');

async function run() {
    try {
        if (await fs.pathExists(jsonPath)) {
            const json = await fs.readJson(jsonPath);
            console.log('ID:', json.id);
            console.log('Has assetIndex:', !!json.assetIndex);
            if (json.assetIndex) {
                console.log('AssetIndex URL:', json.assetIndex.url);
                console.log('AssetIndex ID:', json.assetIndex.id);
            } else {
                console.log('AssetIndex is MISSING!');
            }
        } else {
            console.log('File not found:', jsonPath);
        }
    } catch (e) {
        console.error(e);
    }
}

run();
