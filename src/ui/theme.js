'use strict';
const chalk = require('chalk');
const pkg = require('../../package.json');

const W = 65;
const H = '─';
const V = '│';
const TL = '┌';
const TR = '┐';
const BL = '└';
const BR = '┘';
const T_ = '├';
const _T = '┤';

const VERSION = pkg.version;

const COLORS = {
  primary: chalk.cyan,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  dim: chalk.dim,
  bold: chalk.bold,
  white: chalk.white,
};

const io = require('./io');

function isColorSupported() {
  return io.isTTY() && !process.env.NO_COLOR && !process.env.CI;
}

module.exports = { W, H, V, TL, TR, BL, BR, T_, _T, VERSION, COLORS, isColorSupported };
