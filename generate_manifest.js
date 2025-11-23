const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// CONFIGURATION
// CONFIGURATION
const config = require('./launcher_builder_config.json');

const REPO_USER = config.repoUser;
const REPO_NAME = config.repoName;
const BRANCH = config.branch;
const BASE_URL = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/${BRANCH}/update_files`;

function scanDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            scanDirectory(filePath, fileList);
        } else {
            const relativePath = path.relative(UPDATE_DIR, filePath).replace(/\\/g, '/');

            // Skip hidden files or system files
            if (file.startsWith('.') || file === 'Thumbs.db') return;

            fileList.push({
                path: relativePath,
                url: `${BASE_URL}/${relativePath}`,
                sha1: getFileHash(filePath),
                size: stat.size
            });
        }
    });

    return fileList;
}

console.log(`Scanning ${UPDATE_DIR}...`);

if (!fs.existsSync(UPDATE_DIR)) {
    console.error(`Error: Directory ${UPDATE_DIR} does not exist.`);
    process.exit(1);
}

const files = scanDirectory(UPDATE_DIR);

const LAUNCHER_VERSION = "1.0.15";

const manifest = {
    version: MANIFEST_VERSION,
    gameVersion: GAME_VERSION,
    launcherVersion: LAUNCHER_VERSION,
    launcherUrl: `https://github.com/${REPO_USER}/${REPO_NAME}/releases/download/v${LAUNCHER_VERSION}/OmbiCraft-Launcher-Setup-${LAUNCHER_VERSION}.exe`,
    files: files
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 4));

console.log(`Manifest generated at ${MANIFEST_PATH}`);
console.log(`Total files: ${files.length}`);
console.log(`Version: ${MANIFEST_VERSION}`);
console.log(`LAUNCHER_VERSION=${LAUNCHER_VERSION}`);
