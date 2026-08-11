'use strict';
const ora = require('ora');
const chalk = require('chalk');
const log = require('../utils/logger');
const { prompt } = require('../../src/ui/prompts');
const tui = require('../core/tui');
const { checkAll, installTool, PLATFORM, SUPPORTED_PLATFORMS } = require('../core/prerequisites');

const ALL_TOOLS = ['node', 'npm', 'git', 'python3', 'go', 'java'];

async function doctor() {
  tui.section('🩺 System Prerequisites');

  if (!SUPPORTED_PLATFORMS.includes(PLATFORM)) {
    log.warn(`Platform "${PLATFORM}" is not officially tested yet — only Linux and macOS are supported.`);
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
    choices: missing,
    default: missing,
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
