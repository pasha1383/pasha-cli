'use strict';
const { W, COLORS } = require('../theme');
const { bar, padC, padR, row, BOX } = require('../layout');
const chalk = require('chalk');

function error(title, err) {
  console.log('');
  console.log(COLORS.error(BOX.TL + bar() + BOX.TR));
  console.log(COLORS.error(BOX.V) + padC('  ' + chalk.bold.white(title), W) + COLORS.error(BOX.V));
  if (err && err.message) {
    console.log(COLORS.error(BOX.V) + padR('  ' + COLORS.dim(err.message), W) + COLORS.error(BOX.V));
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
