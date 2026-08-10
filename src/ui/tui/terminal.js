'use strict';

const io = require('../io');

let _saved = null;
let _restoring = false;

function setup() {
  if (!io.isTTY()) return false;

  const stdin = io.getIO().input;
  const stdout = io.getIO().output;

  _saved = {
    isRaw: stdin.isRaw,
    cursorVisible: true,
  };

  if (stdout.isTTY) {
    try { stdout.write('\x1b[?1049h'); } catch (_) {} // enter alt screen
    try { stdout.write('\x1b[?25l'); } catch (_) {}  // hide cursor
  }
  if (stdin.isTTY) {
    try { stdin.setRawMode(true); } catch (_) {}
  }
  stdin.resume();

  return true;
}

function restore() {
  if (_restoring) return;
  _restoring = true;

  if (!_saved) {
    _restoring = false;
    return;
  }

  const stdin = io.getIO().input;
  const stdout = io.getIO().output;

  if (stdin.isTTY) {
    try { stdin.setRawMode(_saved.isRaw); } catch (_) {}
  }
  if (stdout.isTTY) {
    try { stdout.write('\x1b[?25h'); } catch (_) {}  // show cursor
    try { stdout.write('\x1b[?1049l'); } catch (_) {} // leave alt screen
  }

  _saved = null;
  _restoring = false;
}

function onResize(handler) {
  const onSigwinch = () => {
    handler(process.stdout.columns || 80, process.stdout.rows || 24);
  };
  process.on('SIGWINCH', onSigwinch);
  return () => process.removeListener('SIGWINCH', onSigwinch);
}

function registerExitHandlers(restoreFn) {
  const cleanup = () => {
    (restoreFn || restore)();
  };

  const uncaughtHandler = (err) => {
    cleanup();
    console.error(err);
    process.exit(1);
  };

  const sigHandler = (sig) => {
    cleanup();
    const codes = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };
    process.exit(codes[sig] || 128);
  };

  const onSigint = () => sigHandler('SIGINT');
  const onSigterm = () => sigHandler('SIGTERM');
  const onSighup = () => sigHandler('SIGHUP');

  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);
  process.on('SIGHUP', onSighup);
  process.on('uncaughtException', uncaughtHandler);

  return () => {
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
    process.removeListener('SIGHUP', onSighup);
    process.removeListener('uncaughtException', uncaughtHandler);
  };
}

function reset() {
  _saved = null;
  _restoring = false;
}

module.exports = { setup, restore, onResize, registerExitHandlers, reset };
