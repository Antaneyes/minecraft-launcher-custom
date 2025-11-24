const path = require('path');
const fs = require('fs-extra');

// const GameUpdater = require('../utils/GameUpdater'); // Moved inside tests

// Mock Axios
jest.mock('axios');

// Mock Electron
jest.mock('electron', () => ({
    app: {
        isPackaged: true,
        getPath: jest.fn(() => 'tmp')
    }
}));

describe('Integration: Update Flow', () => {
    const testDir = path.join(__dirname, 'temp_test_env_jest');

    // Mock Manifest
    const mockManifest = {
        version: '1.0.0',
        gameVersion: 'fabric-loader-0.14.22-1.20.1',
        files: [
            {
                path: 'mods/test-mod.jar',
                url: 'http://example.com/mods/test-mod.jar',
                sha1: 'da39a3ee5e6b4b0d3255bfef95601890afd80709', // Empty string SHA1
                size: 0
            }
        ]
    };

    // Mock Fabric Profile
    const mockFabricProfile = {
        id: 'fabric-loader-0.14.22-1.20.1',
        libraries: [],
        mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient',
        arguments: { game: [], jvm: [] }
    };

    // Mock Vanilla Profile
    const mockVanillaProfile = {
        id: '1.20.1',
        downloads: {},
        libraries: [],
        assets: '1.20',
        assetIndex: { id: '1.20', sha1: 'abc', size: 100, url: 'http://example.com/assets.json' }
    };

    beforeAll(async () => {
        // Ensure clean state
        await fs.remove(testDir);
        process.env.OMBICRAFT_GAME_ROOT = testDir;
    });

    afterAll(async () => {
        // Cleanup
        await fs.remove(testDir);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should initialize GameUpdater with correct root', () => {
        jest.resetModules(); // Reset cache to pick up new env var
        const GameUpdater = require('../utils/GameUpdater');
        const updater = new GameUpdater();
        expect(updater.gameRoot).toBe(testDir);
    });

    test('should download updates successfully', async () => {
        jest.resetModules();
        const GameUpdater = require('../utils/GameUpdater');
        const updater = new GameUpdater();

        // Mock getUpdateUrl to avoid FS issues in test env
        jest.spyOn(updater, 'getUpdateUrl').mockResolvedValue('https://raw.githubusercontent.com/Antaneyes/minecraft-launcher-custom/master/manifest.json');

        // Mock Axios Responses
        const axios = require('axios'); // Re-require axios
        axios.get.mockImplementation((url) => {
            if (url.includes('manifest.json')) {
                return Promise.resolve({ data: mockManifest });
            }
            if (url.includes('fabricmc.net')) {
                return Promise.resolve({ data: mockFabricProfile });
            }
            if (url.includes('piston-meta.mojang.com')) {
                return Promise.resolve({ data: { versions: [{ id: '1.20.1', url: 'http://mojang.com/1.20.1.json' }] } });
            }
            if (url.includes('mojang.com/1.20.1.json')) {
                return Promise.resolve({ data: mockVanillaProfile });
            }
            return Promise.reject(new Error(`Unexpected URL: ${url}`));
        });

        // Mock File Download (axios called with config object)
        axios.mockImplementation((config) => {
            if (config.url === encodeURI(mockManifest.files[0].url)) {
                const stream = require('stream');
                const readable = new stream.Readable();
                readable._read = () => { }; // No-op
                readable.push(''); // Empty content
                readable.push(null);
                return Promise.resolve({ data: readable });
            }
            return Promise.reject(new Error(`Unexpected Download URL: ${config.url}`));
        });

        // Spy on events
        const logSpy = jest.fn();
        const progressSpy = jest.fn();
        updater.on('log', logSpy);
        updater.on('progress', progressSpy);

        // Run Update
        await updater.checkAndDownloadUpdates();

        // Assertions
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Versión remota: 1.0.0'));
        expect(progressSpy).toHaveBeenCalled();

        // Verify file creation
        const modPath = path.join(testDir, 'mods', 'test-mod.jar');
        expect(await fs.pathExists(modPath)).toBe(true);

        // Verify client-manifest.json
        const clientManifestPath = path.join(testDir, 'client-manifest.json');
        expect(await fs.pathExists(clientManifestPath)).toBe(true);
    });
});
