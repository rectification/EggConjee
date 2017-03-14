// 该模块的作用是检查当前node和npm的版本，假如版本不符合标准那么会直接退出进程

const chalk = require('chalk'),
    // 版本号的语义格式化工具
    semver = require('semver'),
    packageConfig = require('../package.json');

function exec(cmd) {
    return require('child_process').execSync(cmd).toString().trim();
}

const versionRequirements = [
    {
        name: 'node',
        // 子进程查询node版本
        currentVersion: semver.clean(process.version),
        versionRequirement: packageConfig.engines.node
    }, {
        name: 'npm',
        // 子进程查询npm版本
        currentVersion: exec('npm --version'),
        versionRequirement: packageConfig.engines.npm
    }
];

module.exports = function() {
    const warnings = [];
    for (let i = 0; i < versionRequirements.length; i++) {
        const mod = versionRequirements[i];
        if (!semver.satisfies(mod.currentVersion, mod.versionRequirement)) {
            warnings.push(mod.name + ': ' +
                chalk.red(mod.currentVersion) + ' should be ' +
                chalk.green(mod.versionRequirement)
            );
        }
    }

    if (warnings.length) {
        console.log('');
        console.log(chalk.yellow('To use this template, you must update following to modules:'));
        console.log();
        for (const i = 0; i < warnings.length; i++) {
            const warning = warnings[i];
            console.log('  ' + warning);
        }
        console.log();
        process.exit(1);
    }
};
