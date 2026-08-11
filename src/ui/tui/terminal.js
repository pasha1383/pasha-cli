'use strict';

const io = require('../io');

let _saved = null;
let _restoring = false;
let _exitHandlersRegistered = false;
let _handlersRef = null;
let _forceMode = false;

function setForceMode(val) {
  _forceMode = !!val;
}

function setup() {
  if (!io.isTTY() && !_forceMode) return false;

  const stdin = io.getIO().input;
  const stdout = io.getIO().output;

  _saved = {
    isRaw: stdin && stdin.isRaw,
    cursorVisible: true,
  };

  if (stdout && stdout.isTTY) {
    try { stdout.write('\x1b[?1049h'); } catch (_) {} // enter alt screen
    try { stdout.write('\x1b[?25l'); } catch (_) {}  // hide cursor
  }
  if (stdin) {
    try { stdin.setRawMode(true); } catch (_) {}
    try { stdin.resume(); } catch (_) {}
  }

  return true;
}

function restore() {
  if (_restoring) return;
  _restoring = true;

  try {
    if (!_saved) {
      _restoring = false;
      return;
    }

    const stdin = io.getIO().input;
    const stdout = io.getIO().output;

    if (stdin) {
      try { stdin.setRawMode(_saved.isRaw); } catch (_) {}
      try { stdin.pause(); } catch (_) {}
    }
    if (stdout && stdout.isTTY) {
      try { stdout.write('\x1b[?25h'); } catch (_) {}  // show cursor
      try { stdout.write('\x1b[?1049l'); } catch (_) {} // leave alt screen
    }
  } finally {
    _saved = null;
    _restoring = false;
  }
}

function onResize(handler) {
  const onSigwinch = () => {
    handler(io.columns(), io.rows());
  };
  process.on('SIGWINCH', onSigwinch);
  return () => process.removeListener('SIGWINCH', onSigwinch);
}

function registerExitHandlers(restoreFn) {
  if (_exitHandlersRegistered) {
    return _handlersRef || (function () {});
  }

  _exitHandlersRegistered = true;

  const cleanup = () => {
    (restoreFn || restore)();
  };

  var onSigint = null;
  var onSigterm = null;
  var onSighup = null;
  var uncaughtHandler = null;

  var insideHandler = false;
  var exitCalled = false;

  uncaughtHandler = function (err) {
    if (insideHandler) process.exit(1);
    insideHandler = true;
    cleanup();
    console.error(err);
    process.exit(1);
  };

  var sigHandler = function (sig) {
    if (insideHandler) {
      process.exit(128 + { SIGINT: 2, SIGTERM: 15, SIGHUP: 1 }[sig] || 0);
    }
    insideHandler = true;
    cleanup();
    var codes = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };
    process.exit(codes[sig] || 128);
  };

  onSigint = function () { sigHandler('SIGINT'); };
  onSigterm = function () { sigHandler('SIGTERM'); };
  onSighup = function () { sigHandler('SIGHUP'); };

  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);
  process.on('SIGHUP', onSighup);
  process.on('uncaughtException', uncaughtHandler);

  _handlersRef = function () {
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
    process.removeListener('SIGHUP', onSighup);
    process.removeListener('uncaughtException', uncaughtHandler);
    _exitHandlersRegistered = false;
    _handlersRef = null;
  };

  return _handlersRef;
}

function reset() {
  _saved = null;
  _restoring = false;
  _exitHandlersRegistered = false;
  _handlersRef = null;
  _forceMode = false;
}

module.exports = { setup, restore, onResize, registerExitHandlers, reset, setForceMode };
