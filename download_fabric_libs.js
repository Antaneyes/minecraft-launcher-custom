const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const GAME_ROOT = path.join(process.env.APPDATA, '.my-custom-server');
const fabricJsonPath = path.join(GAME_ROOT, 'versions', 'fabric-loader-0.16.9-1.21.9', 'fabric-loader-0.16.9-1.21.9.json');

async function downloadFile(url, dest) {
    try {
        await fs.ensureDir(path.dirname(dest));
        const writer = fs.createWriteStream(dest);
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'stream'
        });
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (e) {
        console.error(`Failed to download ${url}: ${e.message}`);
    }
}

function getMavenUrl(lib) {
    if (lib.url) return lib.url; // Already has a repo URL

    const parts = lib.name.split(':');
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];
    const filename = `${artifact}-${version}.jar`;

    // Default to Maven Central or Fabric Maven
    // Fabric libs usually have "url": "https://maven.fabricmc.net/" in the JSON
    // But if it's missing, we try Fabric first then Central
    return `https://maven.fabricmc.net/${group}/${artifact}/${version}/${filename}`;
}

function getLocalPath(lib) {
    const parts = lib.name.split(':');
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];
    const filename = `${artifact}-${version}.jar`;
    return path.join(GAME_ROOT, 'libraries', group, artifact, version, filename);
}

async function main() {
    console.log(`Reading Fabric JSON from: ${fabricJsonPath}`);
    if (!fs.existsSync(fabricJsonPath)) {
        console.error('Fabric JSON not found!');
        return;
    }

    const fabricJson = await fs.readJson(fabricJsonPath);
    const libraries = fabricJson.libraries;

    console.log(`Found ${libraries.length} libraries.`);

    for (const lib of libraries) {
        // Only focus on Fabric libraries for now, as Vanilla libs should be handled by MCLC or my previous merge
        // But let's try to download everything that looks like it comes from Fabric
        if (lib.name.includes('fabric') || lib.name.includes('asm') || lib.url === "https://maven.fabricmc.net/") {
            const url = lib.url ?
                (lib.url + getMavenPath(lib)) :
                getMavenUrl(lib);

            const dest = getLocalPath(lib);

            if (!fs.existsSync(dest)) {
                console.log(`Downloading ${lib.name}...`);
                console.log(`URL: ${url}`);
                await downloadFile(url, dest);
            } else {
                console.log(`Skipping ${lib.name} (already exists)`);
            }
        }
    }
    console.log('Download complete.');
}

function getMavenPath(lib) {
    const parts = lib.name.split(':');
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];
    return `${group}/${artifact}/${version}/${artifact}-${version}.jar`;
}

main();
