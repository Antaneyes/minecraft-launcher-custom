const fs = require('fs-extra');
const path = require('path');

const GAME_ROOT = path.join(process.env.APPDATA, '.my-custom-server');
const fabricJsonPath = path.join(GAME_ROOT, 'versions', 'fabric-loader-0.16.9-1.21.9', 'fabric-loader-0.16.9-1.21.9.json');
const parentJsonPath = path.join(GAME_ROOT, 'versions', '1.21.9', '1.21.9.json');

async function debugMerge() {
    console.log(`Game Root: ${GAME_ROOT}`);
    console.log(`Fabric JSON: ${fabricJsonPath}`);
    console.log(`Parent JSON: ${parentJsonPath}`);

    if (!fs.existsSync(fabricJsonPath)) {
        console.error('Fabric JSON not found!');
        return;
    }
    if (!fs.existsSync(parentJsonPath)) {
        console.error('Parent JSON not found!');
        return;
    }

    const fabricJson = await fs.readJson(fabricJsonPath);
    const parentJson = await fs.readJson(parentJsonPath);

    console.log(`Fabric Libraries (Before): ${fabricJson.libraries.length}`);
    console.log(`Parent Libraries: ${parentJson.libraries.length}`);

    const existingLibs = new Set(fabricJson.libraries.map(l => l.name));
    const newLibs = parentJson.libraries.filter(l => !existingLibs.has(l.name));

    console.log(`New Libraries to Add: ${newLibs.length}`);

    const mergedLibs = [...fabricJson.libraries, ...newLibs];
    console.log(`Fabric Libraries (After Merge): ${mergedLibs.length}`);

    // Actually write it to verify persistence
    fabricJson.libraries = mergedLibs;

    // Also ensure downloads is there
    if (!fabricJson.downloads) {
        console.log("Downloads section missing, adding it...");
        fabricJson.downloads = {
            "client": {
                "sha1": "ce92fd8d1b2460c41ceda07ae7b3fe863a80d045",
                "size": 30591861,
                "url": "https://piston-data.mojang.com/v1/objects/ce92fd8d1b2460c41ceda07ae7b3fe863a80d045/client.jar"
            }
        };
    }

    await fs.writeJson(fabricJsonPath, fabricJson, { spaces: 4 });
    console.log("Write complete.");
}

debugMerge().catch(console.error);
