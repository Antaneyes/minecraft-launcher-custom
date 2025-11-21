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
        let manifest;
        try {
            // Add cache busting to ensure we get the latest manifest
            const response = await axios.get(`${UPDATE_URL}?t=${Date.now()}`);
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

                sender.send('log', `Downloading: ${file.path} from ${fileUrl}`);

                const dirName = path.dirname(destPath);
                await fs.ensureDir(dirName);

                try {
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
                } catch (fileErr) {
                    if (fileErr.response && fileErr.response.status === 404) {
                        sender.send('log', `WARNING: File not found (404): ${file.path}. Skipping...`);
                    } else {
                        sender.send('log', `ERROR downloading ${file.path}: ${fileErr.message}`);
                        throw fileErr; // Rethrow other errors
                    }
                }
            }

            // --- PATCHING FABRIC JSON ---
            // The Fabric JSON from the server is missing the 'downloads' section and libraries, causing MCLC to fail.
            // We manually inject them here after download to ensure it persists.

            // --- PATCHING FABRIC JSON ---
            // The Fabric JSON from the server is missing the 'downloads' section and libraries, causing MCLC to fail.
            // We manually inject them here after download to ensure it persists.

            const versionsDir = path.join(GAME_ROOT, 'versions');
            const targetVersion = manifest.gameVersion; // e.g., "fabric-loader-0.17.2-1.21.9"
            const targetVersionDir = path.join(versionsDir, targetVersion);
            const targetJsonPath = path.join(targetVersionDir, `${targetVersion}.json`);

            // AUTO-INSTALL: If target version is missing, try to clone from an existing one
            if (!await fs.pathExists(targetVersionDir)) {
                sender.send('log', `Target version ${targetVersion} not found. Attempting to auto-install from existing Fabric version...`);

                if (await fs.pathExists(versionsDir)) {
                    const dirs = await fs.readdir(versionsDir);
                    const existingFabricDir = dirs.find(d => d.startsWith('fabric-loader') && d !== targetVersion);

                    if (existingFabricDir) {
                        const sourceDir = path.join(versionsDir, existingFabricDir);
                        sender.send('log', `Cloning from ${existingFabricDir}...`);

                        await fs.copy(sourceDir, targetVersionDir);

                        // Rename JSON
                        const oldJsonPath = path.join(targetVersionDir, `${existingFabricDir}.json`);
                        if (await fs.pathExists(oldJsonPath)) {
                            await fs.move(oldJsonPath, targetJsonPath);
                        }

                        // Update internal ID and Loader Version in JSON
                        const json = await fs.readJson(targetJsonPath);
                        json.id = targetVersion;

                        // Update fabric-loader library version
                        // Extract version from string "fabric-loader-0.17.2-1.21.9" -> "0.17.2"
                        // Assuming format fabric-loader-<loaderVer>-<gameVer>
                        const match = targetVersion.match(/fabric-loader-(.+?)-/);
                        if (match && match[1]) {
                            const newLoaderVer = match[1];
                            json.libraries.forEach(lib => {
                                if (lib.name.startsWith("net.fabricmc:fabric-loader:")) {
                                    lib.name = `net.fabricmc:fabric-loader:${newLoaderVer}`;
                                    // Clear downloads so it gets regenerated by the generic fix below
                                    delete lib.downloads;
                                    delete lib.url;
                                }
                            });
                        }

                        await fs.writeJson(targetJsonPath, json, { spaces: 4 });
                        sender.send('log', `Created ${targetVersion} successfully.`);
                    } else {
                        sender.send('log', 'ERROR: No existing Fabric version found to clone. Cannot auto-install.');
                    }
                }
            }

            // Proceed to patch the target JSON (whether newly created or existing)
            if (await fs.pathExists(targetJsonPath)) {
                sender.send('log', `Patching Fabric JSON (${targetVersion}) with download info and libraries...`);
                try {
                    const fabricJson = await fs.readJson(targetJsonPath);

                    // Inject downloads (Client JAR)
                    fabricJson.downloads = {
                        "client": {
                            "sha1": "ce92fd8d1b2460c41ceda07ae7b3fe863a80d045",
                            "size": 30591861,
                            "url": "https://piston-data.mojang.com/v1/objects/ce92fd8d1b2460c41ceda07ae7b3fe863a80d045/client.jar"
                        },
                        "client_mappings": {
                            "sha1": "3641ccb54eac2153c7e8274823c5a8e046beaba0",
                            "size": 11510637,
                            "url": "https://piston-data.mojang.com/v1/objects/3641ccb54eac2153c7e8274823c5a8e046beaba0/client.txt"
                        }
                    };

                    // Inject assetIndex
                    fabricJson.assetIndex = {
                        "id": "27",
                        "sha1": "4a667d8cb576e16de8197074c978531c01cd6544",
                        "size": 507362,
                        "totalSize": 435439577,
                        "url": "https://piston-meta.mojang.com/v1/packages/4a667d8cb576e16de8197074c978531c01cd6544/27.json"
                    };
                    fabricJson.assets = "27";

                    // Inject libraries from parent (Vanilla 1.21.9)
                    // This fixes the ClassNotFoundException by ensuring all game libraries are present
                    const parentJsonPath = path.join(GAME_ROOT, 'versions', '1.21.9', '1.21.9.json');
                    if (await fs.pathExists(parentJsonPath)) {
                        try {
                            const parentJson = await fs.readJson(parentJsonPath);
                            if (parentJson.libraries) {
                                sender.send('log', `Merging libraries from Vanilla 1.21.9...`);

                                // DEDUPLICATION LOGIC
                                // 1. Create a map of existing libraries (Fabric) by "group:artifact"
                                //    We use this to prevent adding Vanilla libs that conflict (e.g. different ASM version)
                                const existingLibMap = new Map();
                                fabricJson.libraries.forEach(lib => {
                                    const parts = lib.name.split(':');
                                    const key = `${parts[0]}:${parts[1]}`; // group:artifact
                                    if (!existingLibMap.has(key)) {
                                        existingLibMap.set(key, lib);
                                    }
                                });

                                // 2. Filter Vanilla libraries
                                const newLibs = parentJson.libraries.filter(lib => {
                                    const parts = lib.name.split(':');
                                    const key = `${parts[0]}:${parts[1]}`;
                                    // Only add if we don't already have this artifact (regardless of version)
                                    return !existingLibMap.has(key);
                                });

                                // 3. Reconstruct library list: Unique Fabric Libs + Unique Vanilla Libs
                                fabricJson.libraries = [...Array.from(existingLibMap.values()), ...newLibs];
                                sender.send('log', `Merged ${newLibs.length} new libraries (duplicates skipped).`);
                            }
                        } catch (libErr) {
                            sender.send('log', `Warning: Could not read parent JSON for libraries: ${libErr.message}`);
                        }
                    } else {
                        sender.send('log', 'Warning: Parent JSON (1.21.9) not found. Libraries might be missing.');
                    }

                    // Remove inheritsFrom to force standalone mode
                    delete fabricJson.inheritsFrom;

                    // GENERIC FIX: Auto-generate 'downloads' for ALL libraries if missing
                    // This handles fabric-loader, asm, and any other transitive dependencies
                    fabricJson.libraries.forEach(lib => {
                        if (!lib.downloads && lib.name) {
                            const parts = lib.name.split(':');
                            const group = parts[0].replace(/\./g, '/');
                            const artifact = parts[1];
                            const version = parts[2];
                            const fileName = `${artifact}-${version}.jar`;
                            const relPath = `${group}/${artifact}/${version}/${fileName}`;

                            // Default to Fabric Maven, fallback to Central if needed (though most Fabric libs are on Fabric Maven)
                            const baseUrl = lib.url || "https://maven.fabricmc.net/";
                            const fileUrl = `${baseUrl}${relPath}`;

                            lib.downloads = {
                                "artifact": {
                                    "path": relPath,
                                    "url": fileUrl,
                                    "size": 0 // MCLC might need this, 0 usually works to force check
                                }
                            };
                        }

                        // NATIVES FIX: The parent JSON has natives defined as artifacts, not classifiers.
                        // MCLC needs classifiers to extract them.
                        if (lib.name.includes('natives-')) {
                            const isWindows = lib.name.includes('natives-windows');
                            // const isLinux = lib.name.includes('natives-linux'); // Add if needed
                            // const isMac = lib.name.includes('natives-macos') || lib.name.includes('natives-osx');

                            if (isWindows) {
                                const classifier = 'natives-windows';
                                if (lib.downloads && lib.downloads.artifact && !lib.downloads.classifiers) {
                                    lib.downloads.classifiers = {
                                        [classifier]: lib.downloads.artifact
                                    };
                                    // MCLC might ignore the artifact if classifiers exist, or we can keep it.
                                    // Crucially, we need the 'natives' property.
                                    lib.natives = {
                                        "windows": classifier
                                    };
                                    sender.send('log', `Fixed native library: ${lib.name}`);
                                }
                            }
                        }
                    });

                    await fs.writeJson(targetJsonPath, fabricJson, { spaces: 4 });
                    sender.send('log', 'Fabric JSON patched successfully (Libraries fixed & deduplicated).');
                } catch (patchErr) {
                    sender.send('log', `Error patching Fabric JSON: ${patchErr.message}`);
                }
            }

            sender.send('log', 'All updates downloaded.');

            // Save the manifest locally so the launcher knows what version to play
            await fs.writeJson(path.join(GAME_ROOT, 'client-manifest.json'), manifest);

        }

    } catch (error) {
        throw new Error(`Update failed: ${error.message}`);
    }
}

module.exports = { checkAndDownloadUpdates, GAME_ROOT };
