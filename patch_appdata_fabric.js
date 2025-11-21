const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA;
const filePath = path.join(appData, '.my-custom-server', 'versions', 'fabric-loader-0.16.9-1.21.9', 'fabric-loader-0.16.9-1.21.9.json');

console.log(`Patching file at: ${filePath}`);

if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    process.exit(1);
}

const fabricJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Inject downloads section from Vanilla 1.21.9
fabricJson.downloads = {
    "client": {
        "sha1": "ce92fd8d1b2460c41ceda07ae7b3fe863a80d045",
        "size": 30591861,
        "url": "https://piston-data.mojang.com/v1/objects/ce92fd8d1b2460c41ceda07ae7b3fe863a80d045/client.jar"
    },
    "client_mappings": {
        "sha1": "3641ccb54eac2153c7e8274823c5a8e046beaba0",
        "size": 11510637,
        "url": "https://piston-data.mojang.com/v1/objects/3641ccb54eac2153c7e8274823c5a8e046beaba0/client.txt"
    }
};

// Inject assetIndex
fabricJson.assetIndex = {
    "id": "27",
    "sha1": "4a667d8cb576e16de8197074c978531c01cd6544",
    "size": 507362,
    "totalSize": 435439577,
    "url": "https://piston-meta.mojang.com/v1/packages/4a667d8cb576e16de8197074c978531c01cd6544/27.json"
};

fabricJson.assets = "27";

fs.writeFileSync(filePath, JSON.stringify(fabricJson, null, 4));
console.log('Successfully patched Fabric JSON in AppData.');
