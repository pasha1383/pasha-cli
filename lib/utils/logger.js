'use strict';
const chalk = require('chalk');

const ok = (msg) => console.log(chalk.green(`✅ ${msg}`));
const fail = (msg) => console.log(chalk.red(`❌ ${msg}`));
const warn = (msg) => console.log(chalk.yellow(`⚠️  ${msg}`));
const info = (msg) => console.log(chalk.cyan(msg));
const title = (msg) => console.log('\n' + chalk.bold(msg));

module.exports = { ok, fail, warn, info, title };
