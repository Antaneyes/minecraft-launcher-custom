const fs = require('fs-extra');
const path = require('path');

const optionsPath = path.join(process.env.APPDATA, '.my-custom-server', 'options.txt');

async function run() {
    try {
        let content = '';
        if (await fs.pathExists(optionsPath)) {
            content = await fs.readFile(optionsPath, 'utf8');
        }

        // Update or add lang setting
        if (content.includes('lang:')) {
            content = content.replace(/lang:.*/g, 'lang:es_es');
        } else {
            content += '\nlang:es_es';
        }

        await fs.writeFile(optionsPath, content);
        console.log('Language set to es_es');
    } catch (e) {
        console.error(e);
    }
}

run();
