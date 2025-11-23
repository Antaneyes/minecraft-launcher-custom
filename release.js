const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const packageJsonPath = path.join(__dirname, 'package.json');
const generateManifestPath = path.join(__dirname, 'generate_manifest.js');

// Helper to run commands
function run(command) {
    console.log(`\n> ${command}`);
    try {
        execSync(command, { stdio: 'inherit', cwd: __dirname });
    } catch (e) {
        console.error(`Command failed: ${command}`);
        process.exit(1);
    }
}

async function main() {
    console.log('🚀 Starting Automated Release Process...');

    // 1. Read current version and increment
    const pkg = await fs.readJson(packageJsonPath);
    const oldVersion = pkg.version;
    const versionParts = oldVersion.split('.').map(Number);
    versionParts[2]++; // Increment patch
    const newVersion = versionParts.join('.');

    console.log(`ℹ️  Upgrading from v${oldVersion} to v${newVersion}`);

    // 2. Update package.json
    pkg.version = newVersion;
    await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });

    // 3. Update generate_manifest.js
    let genManifestContent = await fs.readFile(generateManifestPath, 'utf8');
    genManifestContent = genManifestContent.replace(
        /const LAUNCHER_VERSION = ".*";/,
        `const LAUNCHER_VERSION = "${newVersion}";`
    );
    await fs.writeFile(generateManifestPath, genManifestContent);

    // 4. Regenerate Manifest
    console.log('📦 Regenerating manifest...');
    run('node generate_manifest.js');

    // 5. Build
    console.log('🔨 Building application...');
    run('npm run dist');

    // 6. Git Operations
    console.log('Git: Adding changes...');
    run('git add .');

    console.log(`Git: Committing v${newVersion}...`);
    run(`git commit -m "chore: release v${newVersion}"`);

    console.log('Git: Pushing to remote...');
    run('git push origin master');

    // 7. GitHub Release
    console.log(`☁️  Creating GitHub Release v${newVersion}...`);

    const distDir = path.join(__dirname, 'dist');
    const exeName = `OmbiCraft-Launcher-Setup-${newVersion}.exe`;
    const exePath = path.join(distDir, exeName);
    const latestYmlPath = path.join(distDir, 'latest.yml');
    const blockmapPath = `${exePath}.blockmap`;

    // Verify files exist
    if (!fs.existsSync(exePath) || !fs.existsSync(latestYmlPath) || !fs.existsSync(blockmapPath)) {
        console.error('❌ Error: Missing build artifacts. Cannot release.');
        console.error(`Checked: \n - ${exePath}\n - ${latestYmlPath}\n - ${blockmapPath}`);
        process.exit(1);
    }

    const notes = `Release v${newVersion}`;
    // Quote paths to handle spaces
    const cmd = `gh release create v${newVersion} "${exePath}" "${latestYmlPath}" "${blockmapPath}" --notes "${notes}"`;
    run(cmd);

    console.log(`\n✅ Release v${newVersion} completed successfully!`);
}

main().catch(console.error);
