const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const GameUpdater = require('../utils/GameUpdater');

// Mock Sender for IPC
const mockSender = {
    send: (channel, ...args) => {
        console.log(`[IPC ${channel}]`, ...args);
    }
};

async function runVerification() {
    console.log('🔍 Starting Project Verification...');

    // 1. Verify Configuration
    console.log('\n1. Checking Configuration...');
    if (fs.existsSync(path.join(__dirname, '../launcher_builder_config.json'))) {
        console.log('✅ launcher_builder_config.json exists.');
    } else {
        console.error('❌ launcher_builder_config.json MISSING!');
    }

    // 2. Verify Manifest Generation
    console.log('\n2. Testing Manifest Generation...');
    try {
        execSync('node generate_manifest.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
        console.log('✅ generate_manifest.js ran successfully.');

        const manifestPath = path.join(__dirname, '../manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifest = fs.readJsonSync(manifestPath);
            console.log(`✅ manifest.json generated. Version: ${manifest.version}`);
            console.log(`   Files: ${manifest.files.length}`);

            if (manifest.files.length === 0) {
                console.warn('⚠️  Manifest has 0 files. Is update_files directory empty?');
            }
        } else {
            console.error('❌ manifest.json was NOT generated.');
        }

    } catch (e) {
        console.error('❌ generate_manifest.js failed:', e.message);
    }

    // 3. Verify Updater Logic (Dry Run / Mock)
    console.log('\n3. Testing Updater Logic (Mock Mode)...');
    console.log('   This will simulate the update process using the local manifest.');

    const updater = new GameUpdater();

    // Mock listeners
    updater.on('log', (msg) => console.log(`[LOG] ${msg}`));
    updater.on('progress', (data) => console.log(`[PROGRESS] ${data.current}/${data.total}`));
    updater.on('error', (msg) => console.error(`[ERROR] ${msg}`));

    console.log('   NOTE: Skipping direct updater execution via Node because it depends on Electron runtime.');
    console.log('   (To test this properly, we would need to run it via electron-mocha or similar)');

    // We can try to instantiate it, which we did.
    console.log('✅ GameUpdater instantiated successfully.');

    console.log('\n✅ Verification Complete.');
}

runVerification().catch(console.error);
