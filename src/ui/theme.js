'use strict';
const chalk = require('chalk');
const pkg = require('../../package.json');
const io = require('./io');

const W = 65;

const UNICODE = { H: '─', V: '│', TL: '┌', TR: '┐', BL: '└', BR: '┘', T_: '├', _T: '┤' };
const ASCII   = { H: '-', V: '|', TL: '+', TR: '+', BL: '+', BR: '+', T_: '+', _T: '+' };

function _box() { return io.noColor() ? ASCII : UNICODE; }

Object.defineProperties(module.exports, {
  W: { get: function () { return W; }, enumerable: true },
  H:  { get: function () { return _box().H;  }, enumerable: true },
  V:  { get: function () { return _box().V;  }, enumerable: true },
  TL: { get: function () { return _box().TL; }, enumerable: true },
  TR: { get: function () { return _box().TR; }, enumerable: true },
  BL: { get: function () { return _box().BL; }, enumerable: true },
  BR: { get: function () { return _box().BR; }, enumerable: true },
  T_: { get: function () { return _box().T_; }, enumerable: true },
  _T: { get: function () { return _box()._T; }, enumerable: true },
  VERSION: { get: function () { return pkg.version; }, enumerable: true },
});

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
  return io.isTTY() && !io.noColor() && !io.isCI();
}

module.exports.COLORS = COLORS;
module.exports.isColorSupported = isColorSupported;
