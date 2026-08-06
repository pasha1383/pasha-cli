'use strict';
const { spawn } = require('child_process');

/**
 * Runs a command and resolves when it exits successfully.
 *
 * Uses Node's built-in child_process instead of execa: execa v5 is CommonJS
 * and exports the function directly (`module.exports = execa`), while v6+ is
 * ESM-only. Mixing that up silently yields `undefined`, so the call throws a
 * bare TypeError with no exitCode and no error code — which looks exactly like
 * "the command failed instantly for no reason". No dependency, no ambiguity.
 *
 * @param {string} command      Command or absolute path to the binary.
 * @param {string[]} args       Arguments to pass.
 * @param {object} options
 * @param {string} options.cwd  Working directory.
 * @param {string} options.stdio  'inherit' (default) streams output live.
 * @returns {Promise<void>}     Rejects with an Error carrying .exitCode / .code.
 */
function run(command, args = [], options = {}) {
  const { cwd = process.cwd(), stdio = 'inherit' } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio });

    // Fires when the process could not be spawned at all (e.g. ENOENT).
    child.on('error', (err) => {
      const error = new Error(`Failed to start "${command}": ${err.message}`);
      error.code = err.code;
      error.exitCode = null;
      reject(error);
    });

    child.on('close', (exitCode, signal) => {
      if (exitCode === 0) {
        resolve();
        return;
      }
      const detail = signal ? `killed by signal ${signal}` : `exit code ${exitCode}`;
      const error = new Error(`"${command} ${args.join(' ')}" failed (${detail})`);
      error.exitCode = exitCode;
      error.signal = signal;
      reject(error);
    });
  });
}

module.exports = { run };
