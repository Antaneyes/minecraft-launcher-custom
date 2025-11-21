const fs = require('fs-extra');
const path = require('path');

const manifestPath = 'manifest.json';
const baseUrl = 'https://raw.githubusercontent.com/Antaneyes/minecraft-launcher-custom/master/update_files/';

async function run() {
    try {
        const manifest = await fs.readJson(manifestPath);

        manifest.files = manifest.files.map(file => {
            // Fix missing path for balm-fabric (or any other)
            if (!file.path) {
                // Extract filename from URL
                const filename = file.url.split('/').pop();
                // Guess path based on extension or context (balm is a mod)
                if (filename.includes('balm-fabric')) {
                    file.path = `mods/${filename}`;
                } else {
                    console.warn(`Warning: Could not determine path for ${file.url}`);
                }
            }

            // Update URL to include update_files/
            // We assume the file structure in update_files mirrors the 'path' structure
            // But wait, the user moved 'mods' folder into 'update_files'.
            // So 'mods/foo.jar' is now at 'update_files/mods/foo.jar'.
            // So the URL should be baseUrl + file.path.
            // Let's verify if the URL already matches the path structure.

            // Original URL: .../master/mods/foo.jar
            // New URL: .../master/update_files/mods/foo.jar

            // We can just reconstruct the URL from the path using the new base.
            if (file.path) {
                // Ensure forward slashes
                const normalizedPath = file.path.replace(/\\/g, '/');
                file.url = baseUrl + normalizedPath;
            }

            return file;
        });

        await fs.writeJson(manifestPath, manifest, { spaces: 4 });
        console.log('Manifest updated successfully.');

    } catch (e) {
        console.error(e);
    }
}

run();
