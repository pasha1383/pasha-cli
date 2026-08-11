'use strict';

let _plainMode = false;

const defaultIO = {
  get input() { return process.stdin; },
  get output() { return process.stdout; },
  get isTTY() { return process.stdout.isTTY; },
  get columns() { return process.stdout.columns || 80; },
  get rows() { return process.stdout.rows || 24; },
  get colorDepth() { return process.stdout.getColorDepth ? process.stdout.getColorDepth() : 4; },
};

let _io = defaultIO;

function getIO() { return _io; }
function setIO(io) { _io = Object.assign({}, defaultIO, io); }

function isTTY() {
  return _io.isTTY;
}

function columns() {
  return _io.columns;
}

function rows() {
  return _io.rows;
}

function colorDepth() {
  return _io.colorDepth;
}

function isCI() {
  return !!process.env.CI;
}

function noColor() {
  if (_plainMode) return true;
  if (process.env.NO_COLOR) return true;
  if (process.env.TERM === 'dumb') return true;
  return false;
}

function isCompact() {
  return columns() < 60 || rows() < 15;
}

function setPlainMode(val) {
  _plainMode = !!val;
}

function isPlainMode() {
  return _plainMode;
}

function canUseTui(opts) {
  opts = opts || {};
  if (opts.tuiForce) return true;
  if (!isTTY()) return false;
  if (isCI()) return false;
  if (_plainMode) return false;
  if (opts.plain) return false;
  if (opts.tui === false) return false;
  return true;
}

function write(str) {
  _io.output.write(str);
}

function writeLine(str) {
  _io.output.write((str || '') + '\n');
}

module.exports = {
  getIO, setIO, isTTY, columns, rows, colorDepth,
  isCI, noColor, isCompact, setPlainMode, isPlainMode,
  canUseTui, write, writeLine, defaultIO
};
