'use strict';
const chalk = require('chalk');
const log = require('../../utils/logger');
const { prompt } = require('../../ui/prompts');
const { checkAll, installTool, PLATFORM, SUPPORTED_PLATFORMS } = require('../../core/system/prerequisites');

const ALL_TOOLS = ['node', 'npm', 'git', 'python3', 'pip3', 'go', 'java', 'mvn', 'dotnet', 'php', 'composer', 'rustc', 'cargo', 'ruby', 'bundler'];

async function doctor() {
  console.log(chalk.cyan('─'.repeat(65)));
  console.log('  ' + chalk.bold.white('🩺 System Prerequisites'));
  console.log(chalk.cyan('─'.repeat(65)));

  if (!SUPPORTED_PLATFORMS.includes(PLATFORM)) {
    log.warn(`Platform "${PLATFORM}" is not officially tested yet — only Linux, macOS, and Windows are supported.`);
  }

  const results = checkAll(ALL_TOOLS);
  console.log('');
  results.forEach((r) => (r.installed ? log.ok(r.tool) : log.fail(`${r.tool} — not installed`)));

  const missing = results.filter((r) => !r.installed).map((r) => r.tool);
  if (!missing.length) {
    console.log(chalk.green.bold('\n   Everything is ready!\n'));
    return;
  }

  const { toInstall } = await prompt([{
    type: 'checkbox',
    name: 'toInstall',
    message: 'Which ones should I install now?',
    choices: missing.map(t => ({ name: t, value: t, checked: true })),
  }]);

  for (const tool of toInstall) {
    console.log('');
    try {
      await installTool(tool);
      log.ok(`${tool} installed`);
    } catch (err) {
      log.fail(`Failed to install ${tool}: ${err.message}`);
    }
  }
}

module.exports = { doctor, ALL_TOOLS };
