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

function isColorSupported() {
  return process.stdout.isTTY && !process.env.NO_COLOR && !process.env.CI;
}

function shouldUseColors() {
  return isColorSupported();
}

const isTTY = process.stdout.isTTY;
const isCI = !!process.env.CI;
const noColor = !!process.env.NO_COLOR;

module.exports = { W, H, V, TL, TR, BL, BR, T_, _T, VERSION, COLORS, isColorSupported: () => isTTY && !isCI && !noColor, isTTY, isCI, noColor };
