const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

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
        const { app } = require('electron'); // Ensure app is imported if not already, or pass it in. 
        // Actually app is in main process, but this is renderer/updater logic? 
        // Wait, updater.js is used in main process (ipcMain). Yes.

        try {
            if (!app.isPackaged) {
                // DEV MODE: Read local manifest
                const localManifestPath = path.join(__dirname, '..', 'manifest.json');
                if (await fs.pathExists(localManifestPath)) {
                    sender.send('log', 'MODO DEV: Usando manifest.json local.');
                    manifest = await fs.readJson(localManifestPath);
                }
            }

            if (!manifest) {
                // Add cache busting to ensure we get the latest manifest
                const response = await axios.get(`${updateUrl}?t=${Date.now()}`);
                manifest = response.data;
            }
        } catch (e) {
            sender.send('log', 'No se pudo obtener el manifiesto de actualización. Saltando actualización (¿Modo Offline?).');
            return; // Skip updates if server is down
        }

        sender.send('log', `Versión remota: ${manifest.version}`);

        // CHECK FOR LAUNCHER UPDATE
        // CHECK FOR LAUNCHER UPDATE - REMOVED (Handled by electron-updater in main process)


        // Process files
        if (manifest.files && Array.isArray(manifest.files)) {
            // 1. CLEANUP PHASE: Remove old mods
            const adminFile = path.join(GAME_ROOT, '.admin');
            const isAdmin = await fs.pathExists(adminFile);

            if (isAdmin) {
                sender.send('log', 'MODO ADMIN DETECTADO: Saltando limpieza de mods antiguos.');
            } else {
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

                // DEV MODE: Copy from local update_files if available
                if (!app.isPackaged) {
                    const localSourcePath = path.join(__dirname, '..', 'update_files', file.path);
                    if (await fs.pathExists(localSourcePath)) {
                        sender.send('log', `[DEV] Copiando localmente: ${file.path}`);
                        await fs.ensureDir(path.dirname(destPath));
                        await fs.copy(localSourcePath, destPath);
                        processed++;
                        sender.send('progress', { current: processed, total: total, type: 'update' });
                        return;
                    }
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

            // Parse version string: "fabric-loader-{loader}-{mc}"
            const versionParts = manifest.gameVersion.split('-');
            let mcVersion, loaderVersion;

            if (versionParts.length >= 4) {
                // Format: fabric-loader-0.17.2-1.21.9
                loaderVersion = versionParts[2];
                mcVersion = versionParts.slice(3).join('-');
            } else {
                // Fallback/Error handling
                sender.send('log', `Error: Formato de versión desconocido: ${manifest.gameVersion}`);
                throw new Error("Formato de versión inválido. Debe ser 'fabric-loader-LOADER-MC'");
            }

            // Always try to ensure the JSON exists or is valid
            if (!await fs.pathExists(targetJsonPath)) {
                sender.send('log', `Versión ${targetVersion} no detectada. Instalando...`);

                const fabricMetaUrl = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;

                try {
                    await fs.ensureDir(targetVersionDir);
                    const response = await axios.get(fabricMetaUrl);
                    const fabricJson = response.data;
                    fabricJson.id = targetVersion;

                    // --- MERGE WITH VANILLA LOGIC ---
                    // We manually merge to ensure MCLC has a complete, standalone JSON to work with.

                    // 1. Get Vanilla JSON
                    const vanillaMetaUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
                    const vmResponse = await axios.get(vanillaMetaUrl);
                    const vanillaVersionInfo = vmResponse.data.versions.find(v => v.id === mcVersion);

                    if (!vanillaVersionInfo) throw new Error(`Versión Vanilla ${mcVersion} no encontrada.`);

                    const vResponse = await axios.get(vanillaVersionInfo.url);
                    const vanillaJson = vResponse.data;

                    // 2. Merge Libraries
                    // We keep all Fabric libraries. We add Vanilla libraries that are NOT already present (by name).
                    // Fabric usually handles this via 'inheritsFrom', but MCLC sometimes needs a flat file for custom versions.
                    const existingLibs = new Set(fabricJson.libraries.map(l => l.name.split(':')[0] + ':' + l.name.split(':')[1]));

                    vanillaJson.libraries.forEach(lib => {
                        const libName = lib.name.split(':')[0] + ':' + lib.name.split(':')[1];
                        if (!existingLibs.has(libName)) {
                            fabricJson.libraries.push(lib);
                        }
                    });

                    // 3. Merge Arguments
                    if (!fabricJson.arguments) fabricJson.arguments = {};
                    if (vanillaJson.arguments) {
                        // Merge game args
                        const fabricGameArgs = fabricJson.arguments.game || [];
                        const vanillaGameArgs = vanillaJson.arguments.game || [];
                        fabricJson.arguments.game = [...vanillaGameArgs, ...fabricGameArgs];

                        // Merge jvm args
                        const fabricJvmArgs = fabricJson.arguments.jvm || [];
                        const vanillaJvmArgs = vanillaJson.arguments.jvm || [];
                        fabricJson.arguments.jvm = [...vanillaJvmArgs, ...fabricJvmArgs];
                    }

                    // 4. Set Assets
                    fabricJson.assets = vanillaJson.assets;
                    fabricJson.assetIndex = vanillaJson.assetIndex;
                    fabricJson.downloads = vanillaJson.downloads; // Client jar, etc.

                    // 5. Fix Library URLs (The common failure point)
                    fabricJson.libraries.forEach(lib => {
                        try {
                            if (!lib.downloads) lib.downloads = {};
                            if (!lib.downloads.artifact) {
                                const parts = lib.name.split(':');
                                if (parts.length < 3) {
                                    console.warn(`Skipping malformed library name: ${lib.name}`);
                                    return;
                                }
                                const domain = parts[0].replace(/\./g, '/');
                                const name = parts[1];
                                const version = parts[2];
                                const path = `${domain}/${name}/${version}/${name}-${version}.jar`;

                                // Determine Base URL
                                let baseUrl = "https://libraries.minecraft.net/"; // Default Vanilla
                                if (lib.url) baseUrl = lib.url; // Explicit override
                                else if (parts[0].includes('fabricmc') || parts[0].includes('ow2') || parts[0].includes('jetbrains')) {
                                    baseUrl = "https://maven.fabricmc.net/"; // Fabric/Common deps
                                }

                                lib.downloads.artifact = {
                                    path: path,
                                    url: baseUrl + path,
                                    size: 0 // Unknown, but required by some parsers
                                };
                            }
                        } catch (err) {
                            console.error(`Error fixing library ${lib.name}:`, err);
                        }
                    });

                    // Remove 'inheritsFrom' to force MCLC to use our fully merged JSON
                    delete fabricJson.inheritsFrom;

                    await fs.writeJson(targetJsonPath, fabricJson, { spaces: 4 });
                    sender.send('log', `Instalación de ${targetVersion} completada.`);

                } catch (e) {
                    sender.send('log', `ERROR CRÍTICO instalando versión: ${e.message}`);
                    throw e;
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

module.exports = { checkAndDownloadUpdates, GAME_ROOT, compareVersions, calculateHash };
