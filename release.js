const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const generateManifestPath = path.join(__dirname, 'generate_manifest.js');

// Helper to run commands
function run(command) {
    console.log(`\n> ${command}`);
    try {
        return execSync(command, { cwd: __dirname, encoding: 'utf8' }).trim();
    } catch (e) {
        console.error(`Command failed: ${command}`);
        console.error(e.stdout);
        console.error(e.stderr);
        process.exit(1);
    }
}

const config = require('./launcher_builder_config.json');
const { ensureBranch } = require('./utils/git-check');

async function main() {
    console.log('🚀 Starting Automated Release Process...');

    // 0. Safety Check
    ensureBranch(config.branch);

    // 1. Bump Version using npm (updates package.json AND package-lock.json)
    console.log('ℹ️  Bumping version...');
    // --no-git-tag-version because we handle tagging/releasing via gh cli later
    const newVersionTag = run('npm version patch --no-git-tag-version');
    const newVersion = newVersionTag.replace('v', ''); // e.g. "1.0.15"

    console.log(`✅ Version bumped to ${newVersion}`);

    // 2. Update generate_manifest.js
    let genManifestContent = await fs.readFile(generateManifestPath, 'utf8');
    genManifestContent = genManifestContent.replace(
        /const LAUNCHER_VERSION = ".*";/,
        `const LAUNCHER_VERSION = "${newVersion}";`
    );
    await fs.writeFile(generateManifestPath, genManifestContent);

    // 3. Regenerate Manifest
    console.log('📦 Regenerating manifest...');
    run('node generate_manifest.js');

    // 4. Build
    console.log('🔨 Building application...');
    run('npm run dist');

    // 5. Git Operations
    console.log('Git: Adding changes...');
    run('git add .');

    console.log(`Git: Committing v${newVersion}...`);
    run(`git commit -m "chore: release v${newVersion}"`);

    console.log('Git: Pushing to remote...');
    run(`git push origin ${config.branch}`);


    // 6. GitHub Release
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
