const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const generateManifestPath = path.join(__dirname, 'generate_manifest.js');

const args = process.argv.slice(2);
console.log('DEBUG ARGS:', args);
const DRY_RUN = args.includes('--dry-run');

// Helper to run commands
function run(command) {
    console.log(`\n> ${command}`);
    if (DRY_RUN) {
        console.log('   [DRY-RUN] Command skipped.');
        // Return mock values for commands that return output
        if (command.startsWith('npm version')) return 'v1.0.0-dryrun';
        return '';
    }
    try {
        return execSync(command, { cwd: path.join(__dirname, '..'), encoding: 'utf8' }).trim();
    } catch (e) {
        console.error(`Command failed: ${command}`);
        console.error(e.stdout);
        console.error(e.stderr);
        process.exit(1);
    }
}

const config = require('../launcher_builder_config.json');
const { ensureBranch } = require('./git-check');
const { validateConfig } = require('../utils/config-validator');

async function main() {
    console.log('🚀 Starting Automated Release Process...');
    if (DRY_RUN) console.log('⚠️  DRY RUN MODE ENABLED: No changes will be made.');

    // 0. Safety Check
    validateConfig();
    ensureBranch(config.branch, DRY_RUN);

    // 1. Bump Version using npm (updates package.json AND package-lock.json)
    console.log('ℹ️  Bumping version...');
    // --no-git-tag-version because we handle tagging/releasing via gh cli later
    const newVersionTag = run('npm version patch --no-git-tag-version');
    const newVersion = newVersionTag.replace('v', ''); // e.g. "1.0.15"

    console.log(`✅ Version bumped to ${newVersion}`);

    // 2. Update generate_manifest.js
    if (!DRY_RUN) {
        let genManifestContent = await fs.readFile(generateManifestPath, 'utf8');
        genManifestContent = genManifestContent.replace(
            /const LAUNCHER_VERSION = ".*";/,
            `const LAUNCHER_VERSION = '${newVersion}';`
        );
        await fs.writeFile(generateManifestPath, genManifestContent);
    } else {
        console.log('   [DRY-RUN] Skipping generate_manifest.js update.');
    }

    // 3. Regenerate Manifest
    console.log('📦 Regenerating manifest...');
    run('node maintenance/generate_manifest.js');

    // 4. Build
    console.log('🔨 Building application...');
    const gameUpdaterPath = path.join(__dirname, '..', 'utils', 'GameUpdater.js');
    let originalGameUpdaterContent = '';

    if (!DRY_RUN) {
        // Inject Branch URL
        console.log(`   Injecting update URL for branch: ${config.branch}`);
        originalGameUpdaterContent = await fs.readFile(gameUpdaterPath, 'utf8');
        const newUrl = `https://raw.githubusercontent.com/${config.repoUser}/${config.repoName}/${config.branch}/manifest.json`;
        const modifiedContent = originalGameUpdaterContent.replace(
            /this\.defaultUpdateUrl = '.*';/,
            `this.defaultUpdateUrl = '${newUrl}';`
        );
        await fs.writeFile(gameUpdaterPath, modifiedContent);
    } else {
        console.log(`   [DRY-RUN] Would inject update URL for branch: ${config.branch}`);
    }

    try {
        run('npm run dist');
    } finally {
        // Revert GameUpdater.js
        if (!DRY_RUN && originalGameUpdaterContent) {
            console.log('   Reverting GameUpdater.js...');
            await fs.writeFile(gameUpdaterPath, originalGameUpdaterContent);
        }
    }

    // 5. Git Operations
    console.log('Git: Adding changes...');
    run('git add .');

    console.log(`Git: Committing v${newVersion}...`);
    run(`git commit -m "chore: release v${newVersion}"`);

    console.log('Git: Pushing to remote...');
    run(`git push origin ${config.branch}`);

    // 6. GitHub Release
    console.log(`☁️  Creating GitHub Release v${newVersion}...`);

    const distDir = path.join(__dirname, '..', 'dist');
    const exeName = `OmbiCraft-Launcher-Setup-${newVersion}.exe`;
    const exePath = path.join(distDir, exeName);
    const latestYmlPath = path.join(distDir, 'latest.yml');
    const blockmapPath = `${exePath}.blockmap`;

    // Verify files exist (Skip in dry-run as build is skipped)
    if (!DRY_RUN) {
        if (!fs.existsSync(exePath) || !fs.existsSync(latestYmlPath) || !fs.existsSync(blockmapPath)) {
            console.error('❌ Error: Missing build artifacts. Cannot release.');
            console.error(`Checked: \n - ${exePath}\n - ${latestYmlPath}\n - ${blockmapPath}`);
            process.exit(1);
        }
    } else {
        console.log('   [DRY-RUN] Skipping artifact verification.');
    }

    const notes = `Release v${newVersion}`;
    // Quote paths to handle spaces
    const cmd = `gh release create v${newVersion} "${exePath}" "${latestYmlPath}" "${blockmapPath}" --notes "${notes}"`;
    run(cmd);

    console.log(`\n✅ Release v${newVersion} completed successfully!`);
}

main().catch(console.error);
