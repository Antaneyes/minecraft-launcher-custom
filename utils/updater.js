const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const crypto = require('crypto');

// CONFIGURATION
const GAME_ROOT = path.join(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share"), '.minecraft_server_josh');
const CONFIG_PATH = path.join(GAME_ROOT, 'launcher-config.json');
const DEFAULT_UPDATE_URL = 'https://raw.githubusercontent.com/Antaneyes/minecraft-launcher-custom/master/manifest.json';

async function getUpdateUrl() {
    try {
        if (await fs.pathExists(CONFIG_PATH)) {
            const config = await fs.readJson(CONFIG_PATH);
            if (config.updateUrl) return config.updateUrl;
        }
    } catch (e) {
        console.error("Error reading config:", e);
    }
    return DEFAULT_UPDATE_URL;
}

async function calculateHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha1');
        const stream = fs.createReadStream(filePath);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}



function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const val1 = parts1[i] || 0;
        const val2 = parts2[i] || 0;
        if (val1 > val2) return 1;
        if (val1 < val2) return -1;
    }
    return 0;
}

async function checkAndDownloadUpdates(sender) {
    try {
        // Ensure game directory exists
        await fs.ensureDir(GAME_ROOT);

        const updateUrl = await getUpdateUrl();
        sender.send('log', `Buscando actualizaciones en: ${updateUrl}`);

        // Fetch manifest
        let manifest;
        try {
            // Add cache busting to ensure we get the latest manifest
            const response = await axios.get(`${updateUrl}?t=${Date.now()}`);
            manifest = response.data;
        } catch (e) {
            sender.send('log', 'No se pudo obtener el manifiesto de actualización. Saltando actualización (¿Modo Offline?).');
            return; // Skip updates if server is down
        }

        sender.send('log', `Versión remota: ${manifest.version}`);

        // CHECK FOR LAUNCHER UPDATE
        const appVersion = require('electron').app.getVersion();
        if (manifest.launcherVersion && compareVersions(manifest.launcherVersion, appVersion) > 0) {
            sender.send('log', `¡Nueva versión del launcher disponible: ${manifest.launcherVersion}!`);
            sender.send('launcher-update-available', manifest.launcherUrl);
        }

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
                        sender.send('log', `Eliminando mod antiguo: ${file}`);
                        await fs.remove(path.join(modsDir, file));
                    }
                }
            }

            // 2. DOWNLOAD PHASE (Parallel with Concurrency Limit)
            let processed = 0;
            const total = manifest.files.length;
            const CONCURRENCY_LIMIT = 5;
            const PRESERVED_FILES = ['options.txt', 'optionsof.txt', 'optionsshaders.txt', 'servers.dat'];

            const downloadFile = async (file) => {
                const destPath = path.join(GAME_ROOT, file.path);
                const fileUrl = file.url;
                const fileName = path.basename(file.path);

                // Check if file is a user config file and exists -> SKIP
                if (PRESERVED_FILES.includes(fileName) && await fs.pathExists(destPath)) {
                    sender.send('log', `Conservando archivo de usuario: ${fileName}`);
                    processed++;
                    sender.send('progress', { current: processed, total: total, type: 'update' });
                    return;
                }

                // Check if file exists and hash matches (if provided)
                if (await fs.pathExists(destPath)) {
                    if (file.sha1) {
                        const localHash = await calculateHash(destPath);
                        if (localHash === file.sha1) {
                            // File is up to date
                            processed++;
                            sender.send('progress', { current: processed, total: total, type: 'update' });
                            return;
                        }
                    }
                }

                sender.send('log', `Descargando: ${file.path}`);
                const dirName = path.dirname(destPath);
                await fs.ensureDir(dirName);

                try {
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

                    // Verify Hash after download
                    if (file.sha1) {
                        const newHash = await calculateHash(destPath);
                        if (newHash !== file.sha1) {
                            const msg = `ADVERTENCIA HASH: ${file.path} | Esperado: ${file.sha1} | Obtenido: ${newHash}`;
                            console.warn(msg);
                            sender.send('log', msg);
                            // throw new Error(`Hash mismatch for ${file.path}`);
                        }
                    }

                    processed++;
                    sender.send('progress', { current: processed, total: total, type: 'update' });
                } catch (fileErr) {
                    if (fileErr.response && fileErr.response.status === 404) {
                        sender.send('log', `ADVERTENCIA: Archivo no encontrado (404): ${file.path}. Saltando...`);
                    } else {
                        sender.send('log', `ERROR descargando ${file.path}: ${fileErr.message}`);
                        throw fileErr;
                    }
                }
            };

            // Process files in chunks
            for (let i = 0; i < manifest.files.length; i += CONCURRENCY_LIMIT) {
                const chunk = manifest.files.slice(i, i + CONCURRENCY_LIMIT);
                await Promise.all(chunk.map(downloadFile));
            }

            // --- PATCHING FABRIC JSON ---
            const versionsDir = path.join(GAME_ROOT, 'versions');
            const targetVersion = manifest.gameVersion;
            const targetVersionDir = path.join(versionsDir, targetVersion);
            const targetJsonPath = path.join(targetVersionDir, `${targetVersion}.json`);

            // AUTO-INSTALL logic (simplified for brevity, assuming it works or is handled above)
            // ... (Keep existing auto-install logic if possible, or re-include it)
            // Actually, I need to include the auto-install logic here because I am replacing the block.

            if (!await fs.pathExists(targetVersionDir)) {
                sender.send('log', `Versión objetivo ${targetVersion} no encontrada. Intentando auto-instalación...`);

                // Parse versions from string: "fabric-loader-{loader}-{mc}"
                // Example: "fabric-loader-0.17.2-1.21.9"
                const versionParts = manifest.gameVersion.split('-');
                // Assuming format: fabric-loader-[loaderVersion]-[mcVersion]
                // parts[0] = fabric, parts[1] = loader, parts[2] = loaderVersion, parts[3] = mcVersion

                let mcVersion = manifest.gameVersion.split('-').pop(); // Fallback
                let loaderVersion = '0.17.2'; // Fallback

                if (versionParts.length >= 4) {
                    loaderVersion = versionParts[2];
                    mcVersion = versionParts.slice(3).join('-'); // Join rest in case MC version has dashes
                }

                const fabricMetaUrl = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
                try {
                    await fs.ensureDir(targetVersionDir);
                    const response = await axios.get(fabricMetaUrl);
                    const json = response.data;
                    json.id = targetVersion;
                    json.downloads = {
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
                    json.assetIndex = {
                        "id": "27",
                        "sha1": "4a667d8cb576e16de8197074c978531c01cd6544",
                        "size": 507362,
                        "totalSize": 435439577,
                        "url": "https://piston-meta.mojang.com/v1/packages/4a667d8cb576e16de8197074c978531c01cd6544/27.json"
                    };
                    json.assets = "27";
                    await fs.writeJson(targetJsonPath, json, { spaces: 4 });
                    sender.send('log', `Descargado ${targetVersion}.`);
                } catch (e) {
                    sender.send('log', `Auto-instalación fallida: ${e.message}`);
                }
            }

            if (await fs.pathExists(targetJsonPath)) {
                sender.send('log', `Parcheando JSON de Fabric...`);
                try {
                    const fabricJson = await fs.readJson(targetJsonPath);

                    // 1. Inject Downloads (redundant if auto-installed, but good for safety)
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

                    // 2. Merge Libraries & Arguments from Vanilla
                    const parentVersion = targetVersion.split('-').pop();
                    const parentDir = path.join(GAME_ROOT, 'versions', parentVersion);
                    const parentJsonPath = path.join(parentDir, `${parentVersion}.json`);

                    if (!await fs.pathExists(parentJsonPath)) {
                        // Download Vanilla JSON
                        try {
                            await fs.ensureDir(parentDir);
                            const vm = await axios.get('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
                            const v = vm.data.versions.find(v => v.id === parentVersion);
                            if (v) {
                                const vRes = await axios.get(v.url);
                                await fs.writeJson(parentJsonPath, vRes.data, { spaces: 4 });
                            }
                        } catch (e) {
                            sender.send('log', `Error descargando JSON Vanilla: ${e.message}`);
                        }
                    }

                    if (await fs.pathExists(parentJsonPath)) {
                        const parentJson = await fs.readJson(parentJsonPath);

                        // Merge Libraries
                        const existingLibMap = new Map();
                        fabricJson.libraries.forEach(lib => {
                            const parts = lib.name.split(':');
                            existingLibMap.set(`${parts[0]}:${parts[1]}`, lib);
                        });

                        parentJson.libraries.forEach(lib => {
                            if (lib.name.includes('natives-')) {
                                // Always add natives
                                fabricJson.libraries.push(lib);
                            } else {
                                const parts = lib.name.split(':');
                                const key = `${parts[0]}:${parts[1]}`;
                                if (!existingLibMap.has(key)) {
                                    fabricJson.libraries.push(lib);
                                }
                            }
                        });

                        // Inject Arguments (CRITICAL)
                        if (parentJson.arguments) {
                            fabricJson.arguments = parentJson.arguments;
                        }

                        // Inject Asset Index
                        if (parentJson.assetIndex) {
                            fabricJson.assetIndex = parentJson.assetIndex;
                            fabricJson.assets = parentJson.assets;
                        }
                    }

                    // 3. Fix Natives & Downloads
                    delete fabricJson.inheritsFrom;

                    fabricJson.libraries.forEach(lib => {
                        // Generic download fix
                        if (!lib.downloads && lib.name) {
                            const parts = lib.name.split(':');
                            const relPath = `${parts[0].replace(/\./g, '/')}/${parts[1]}/${parts[2]}/${parts[1]}-${parts[2]}.jar`;
                            lib.downloads = {
                                "artifact": {
                                    "path": relPath,
                                    "url": (lib.url || "https://maven.fabricmc.net/") + relPath,
                                    "size": 0
                                }
                            };
                        }
                        // Natives fix
                        if (lib.name.includes('natives-windows')) {
                            if (!lib.downloads.classifiers) {
                                lib.downloads.classifiers = { "natives-windows": lib.downloads.artifact };
                                lib.natives = { "windows": "natives-windows" };
                            }
                        }
                    });

                    await fs.writeJson(targetJsonPath, fabricJson, { spaces: 4 });
                    sender.send('log', 'JSON de Fabric parcheado correctamente.');

                } catch (e) {
                    sender.send('log', `Error parcheando JSON: ${e.message}`);
                }
            }

            sender.send('log', 'Todas las actualizaciones descargadas.');

            // Save the manifest locally so the launcher knows what version to play
            await fs.writeJson(path.join(GAME_ROOT, 'client-manifest.json'), manifest);
        } // Close if (manifest.files)

    } catch (error) {
        throw new Error(`Actualización fallida: ${error.message}`);
    }
}

module.exports = { checkAndDownloadUpdates, GAME_ROOT };
