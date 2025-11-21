const fs = require('fs');
const path = require('path');

// CONFIGURATION
const BASE_URL = 'https://raw.githubusercontent.com/Antaneyes/minecraft-launcher-custom/master'; // Change this to your hosting URL
const OUTPUT_FILE = 'manifest.json';
const GAME_VERSION = 'fabric-loader-0.17.2-1.21.9';
const UPDATE_DIR = 'update_files';

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
    version: "1.0.2",
    gameVersion: GAME_VERSION,
    versionType: "custom",
    files: []
};

console.log("Generating manifest...");

if (fs.existsSync(UPDATE_DIR)) {
    const files = walk(UPDATE_DIR);
    files.forEach(f => {
        // Normalize path to forward slashes
        const fullPath = f.replace(/\\/g, '/');

        // Path for the game (relative to game root, so strip 'update_files/')
        const relativePath = fullPath.replace(`${UPDATE_DIR}/`, '');

        // URL for download (includes 'update_files/')
        const url = `${BASE_URL}/${fullPath}`;

        manifest.files.push({
            path: relativePath,
            url: url
        });
    });
} else {
    console.error(`Error: Directory '${UPDATE_DIR}' not found.`);
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 4));
console.log(`Done! Manifest saved to ${OUTPUT_FILE}`);
console.log(`Total files: ${manifest.files.length}`);
