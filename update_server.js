const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

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

async function main() {
    console.log('🚀 Starting Server Content Update...');
    console.log('   (This will update mods/configs/versions, NOT the launcher itself)');

    // 1. Regenerate Manifest
    console.log('📦 Regenerating manifest...');
    run('node generate_manifest.js');

    // 2. Git Operations
    console.log('Git: Adding changes...');
    run('git add .');

    // Check if there are changes to commit
    try {
        const status = run('git status --porcelain');
        if (!status) {
            console.log('✨ No changes to commit. Everything is up to date.');
            return;
        }
    } catch (e) {
        // Ignore error
    }

    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    console.log(`Git: Committing updates (${timestamp})...`);
    run(`git commit -m "content: update game files ${timestamp}"`);

    console.log('Git: Pushing to remote...');
    run('git push origin master');

    console.log('\n✅ Server update published successfully!');
    console.log('   Players will receive the new files next time they open the launcher.');
}

main().catch(console.error);
