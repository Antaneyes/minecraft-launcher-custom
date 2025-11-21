const fs = require('fs');
const path = require('path');

// CONFIGURATION
const BASE_URL = 'https://raw.githubusercontent.com/Antaneyes/minecraft-launcher-custom/master'; // Change this to your hosting URL
const OUTPUT_FILE = 'manifest.json';
const GAME_VERSION = 'fabric-loader-0.16.9-1.21.9'; // Change to your actual fabric version folder name

// Folders/Files to include
const INCLUDES = [
    'mods',
    'config',
    'xaero',
    'options.txt',
    'servers.dat'
];

// Helper to walk directory
function walk(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const manifest = {
    version: "1.0.0",
    gameVersion: GAME_VERSION,
    versionType: "custom",
    files: []
};

console.log("Generating manifest...");

INCLUDES.forEach(item => {
    if (fs.existsSync(item)) {
        const stat = fs.statSync(item);
        if (stat.isDirectory()) {
            const files = walk(item);
            files.forEach(f => {
                // Normalize path to forward slashes
                const relativePath = f.replace(/\\/g, '/');
                manifest.files.push({
                    path: relativePath,
                    url: `${BASE_URL}/${relativePath}`
                });
            });
        } else {
            manifest.files.push({
                path: item,
                url: `${BASE_URL}/${item}`
            });
        }
    } else {
        console.warn(`Warning: ${item} not found in current directory.`);
    }
});

// Also try to find the fabric version json if possible
// This assumes the script is run in the .minecraft root
const versionsDir = 'versions';
if (fs.existsSync(versionsDir)) {
    const files = walk(versionsDir);
    files.forEach(f => {
        if (f.includes(GAME_VERSION) && f.endsWith('.json')) {
            const relativePath = f.replace(/\\/g, '/');
            manifest.files.push({
                path: relativePath,
                url: `${BASE_URL}/${relativePath}`
            });
        }
    });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
console.log(`Done! Manifest saved to ${OUTPUT_FILE}`);
console.log(`Total files: ${manifest.files.length}`);
