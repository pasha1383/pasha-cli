'use strict';
const { W, VERSION, COLORS } = require('../theme');
const { bar, padC, row, BOX } = require('../layout');
const chalk = require('chalk');

function welcome() {
  if (!process.stdout.isTTY || process.env.CI || process.env.NO_COLOR) return;

  const logo = [
    '  ____             __         ',
    ' / __ \\____  _____/ /_  ____ _',
    '/ /_/ / __ `/ ___/ __ \\/ __ `/',
    '/ ____/ /_/ (__  ) / / / /_/ /',
    '/_/    \\__,_/____/_/ /_/\\__,_/ ',
  ];

  console.log('');
  console.log(COLORS.primary(BOX.TL + bar() + BOX.TR));
  for (const ln of logo) {
    console.log(row('  ' + chalk.white.bold(ln)));
  }
  console.log(row(''));
  console.log(row(padC(COLORS.dim(`project generator v${VERSION}`), W)));
  console.log(COLORS.primary(BOX.BL + bar() + BOX.BR));
  console.log('');
  console.log(COLORS.primary('  ') + chalk.white.bold("Let's build your project.") + COLORS.dim('  Press Ctrl+C to cancel anytime.'));
  console.log('');
}

module.exports = { welcome };
