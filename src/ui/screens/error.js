'use strict';
const { W, COLORS } = require('../theme');
const { bar, padC, row, wrapLine, BOX } = require('../layout');
const chalk = require('chalk');
const io = require('../io');

// error() renders a readable, actionable fatal-error panel: the red border
// and title make it unmistakable that something failed, but the message
// body and hint use normal/dim text rather than more red, so the important
// details (what happened, what to try) aren't fighting the alarm color for
// attention. `hint` is optional; a sensible default is used when omitted.
function error(title, err, hint) {
  const message = err && err.message ? err.message : (typeof err === 'string' ? err : null);
  const tryNext = hint || 'Run again with --plain for a simpler view, or re-run with the same options to retry.';

  if (!io.isTTY() || io.isCI() || io.noColor()) {
    console.error(`\n${title}`);
    if (message) console.error(message);
    console.error(`Try: ${tryNext}\n`);
    return;
  }

  console.log('');
  console.log(COLORS.error(BOX.TL + bar() + BOX.TR));
  console.log(COLORS.error(BOX.V) + padC(chalk.bold.white(title), W) + COLORS.error(BOX.V));
  if (message) {
    console.log(row(''));
    for (const line of wrapLine(message, W - 4)) {
      console.log(row('  ' + chalk.white(line)));
    }
  }
  console.log(row(''));
  for (const line of wrapLine('Try: ' + tryNext, W - 4)) {
    console.log(row('  ' + COLORS.dim(line)));
  }
  console.log(COLORS.error(BOX.BL + bar() + BOX.BR));
  console.log('');
}

function section(title) {
  console.log('');
  console.log(COLORS.primary(bar()));
  console.log('  ' + chalk.bold.white(title));
  console.log(COLORS.primary(bar()));
  console.log('');
}

function divider() {
  console.log('');
  console.log(COLORS.dim(bar()));
  console.log('');
}

module.exports = { error, section, divider };
