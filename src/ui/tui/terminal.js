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

  const sigHandler = () => {
    cleanup();
    process.exit(128 + 2);
  };

  process.on('SIGINT', sigHandler);
  process.on('SIGTERM', sigHandler);
  process.on('SIGHUP', sigHandler);

  process.on('uncaughtException', (err) => {
    cleanup();
    console.error(err);
    process.exit(1);
  });

  return () => {
    process.removeListener('SIGINT', sigHandler);
    process.removeListener('SIGTERM', sigHandler);
    process.removeListener('SIGHUP', sigHandler);
  };
}

function reset() {
  _saved = null;
  _restoring = false;
}

module.exports = { setup, restore, onResize, registerExitHandlers, reset };
