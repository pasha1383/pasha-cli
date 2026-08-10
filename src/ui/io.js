'use strict';

const defaultIO = {
  get input() { return process.stdin; },
  get output() { return process.stdout; },
  get isTTY() { return process.stdout.isTTY; },
  get columns() { return process.stdout.columns || 80; },
  get rows() { return process.stdout.rows || 24; },
  get colorDepth() { return process.stdout.getColorDepth ? process.stdout.getColorDepth() : 4; },
};

let _io = defaultIO;

function getIO() {
  return _io;
}

function setIO(io) {
  _io = Object.assign({}, defaultIO, io);
}

function isTTY() {
  return _io.isTTY;
}

function columns() {
  return _io.columns;
}

function rows() {
  return _io.rows;
}

function write(str) {
  _io.output.write(str);
}

function writeLine(str) {
  _io.output.write((str || '') + '\n');
}

module.exports = { getIO, setIO, isTTY, columns, rows, write, writeLine, defaultIO };
