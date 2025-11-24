const { execSync } = require('child_process');

function getCurrentBranch() {
    try {
        return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (e) {
        return null;
    }
}

function ensureBranch(requiredBranch) {
    const current = getCurrentBranch();
    if (!current) {
        throw new Error('Could not determine current git branch. Are you in a git repository?');
    }

    if (current !== requiredBranch) {
        console.error(`\n❌ ERROR: Branch Mismatch!`);
        console.error(`   Current branch: '${current}'`);
        console.error(`   Required branch: '${requiredBranch}' (from launcher_builder_config.json)`);
        console.error(`\n   Please switch to '${requiredBranch}' before running this script.`);
        console.error(`   > git checkout ${requiredBranch}\n`);
        process.exit(1);
    }

    console.log(`✅ Branch check passed: Running on '${current}'`);
}

module.exports = { ensureBranch, getCurrentBranch };
