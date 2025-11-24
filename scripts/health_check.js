const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) {
    console.log(`${color}${msg}${RESET}`);
}

function runCommand(command, name) {
    log(`\nRunning ${name}...`, YELLOW);
    try {
        execSync(command, { stdio: 'inherit' });
        log(`✅ ${name} passed.`, GREEN);
        return true;
    } catch (e) {
        log(`❌ ${name} failed.`, RED);
        return false;
    }
}

function checkFiles() {
    log('\nChecking critical files...', YELLOW);
    const requiredFiles = [
        'index.js',
        'package.json',
        'manifest.json',
        'ui/index.html',
        'ui/styles.css',
        'ui/renderer.js',
        'utils/GameUpdater.js',
        'utils/launcher.js',
        'maintenance/generate_manifest.js',
        'maintenance/release.js',
        'maintenance/update_server.js'
    ];

    let allFound = true;
    for (const file of requiredFiles) {
        if (fs.existsSync(path.join(__dirname, '..', file))) {
            // log(`  Found ${file}`, GREEN);
        } else {
            log(`  Missing ${file}`, RED);
            allFound = false;
        }
    }

    if (allFound) {
        log('✅ All critical files found.', GREEN);
    }
    return allFound;
}

function main() {
    log('🔍 Starting Project Health Check...', YELLOW);

    let success = true;

    // 1. Check Files
    if (!checkFiles()) success = false;

    // 2. Run Lint
    if (!runCommand('npx eslint .', 'Linting')) success = false;

    // 3. Run Unit Tests
    if (!runCommand('npm test', 'Unit Tests')) success = false;

    log('\n-----------------------------------');
    if (success) {
        log('🎉 PROJECT HEALTHY', GREEN);
        process.exit(0);
    } else {
        log('⚠️  PROJECT HAS ISSUES', RED);
        process.exit(1);
    }
}

main();
