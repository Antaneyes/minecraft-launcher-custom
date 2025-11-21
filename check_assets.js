const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const GAME_ROOT = path.join(process.env.APPDATA, '.my-custom-server');
const ASSETS_DIR = path.join(GAME_ROOT, 'assets');
const INDEX_PATH = path.join(ASSETS_DIR, 'indexes', '27.json');
const OBJECTS_DIR = path.join(ASSETS_DIR, 'objects');

async function calculateSha1(filePath) {
    const buffer = await fs.readFile(filePath);
    const hash = crypto.createHash('sha1');
    hash.update(buffer);
    return hash.digest('hex');
}

async function run() {
    try {
        console.log('Checking assets in:', ASSETS_DIR);

        if (await fs.pathExists(INDEX_PATH)) {
            console.log('Index 27.json FOUND.');
            const sha1 = await calculateSha1(INDEX_PATH);
            console.log('SHA1:', sha1);
            if (sha1 === '4a667d8cb576e16de8197074c978531c01cd6544') {
                console.log('SHA1 matches Mojang.');
            } else {
                console.log('SHA1 MISMATCH!');
            }
        } else {
            console.log('Index 27.json NOT FOUND.');
        }

        if (await fs.pathExists(OBJECTS_DIR)) {
            const files = await fs.readdir(OBJECTS_DIR);
            console.log('Objects directory exists.');
            console.log('Subdirectories (buckets):', files.length);

            // Check a few random buckets
            let totalFiles = 0;
            for (const file of files) {
                const bucketPath = path.join(OBJECTS_DIR, file);
                const bucketFiles = await fs.readdir(bucketPath);
                totalFiles += bucketFiles.length;
            }
            console.log('Total asset objects found (approx):', totalFiles);
        } else {
            console.log('Objects directory NOT FOUND.');
        }

    } catch (e) {
        console.error(e);
    }
}

run();
