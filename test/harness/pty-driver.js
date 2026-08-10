'use strict';

const pty = require('node-pty');
const path = require('path');
const { EventEmitter } = require('events');

const DEFAULT_TIMEOUT = 30000;

class PtyDriver extends EventEmitter {
  constructor(opts = {}) {
    super();
    this._cols = opts.cols || 80;
    this._rows = opts.rows || 24;
    this._timeout = opts.timeout || DEFAULT_TIMEOUT;
    this._output = '';
    this._matchedPos = 0;
    this._pty = null;
    this._exited = false;
    this._exitCode = null;
    this._promises = [];
    this._sentinel = null;
  }

  spawn(command, args, cwd) {
    const spawnOptions = {
      name: 'xterm-256color',
      cols: this._cols,
      rows: this._rows,
      cwd: cwd || process.cwd(),
      env: Object.assign({}, process.env, {
        TERM: 'xterm-256color',
        CI: 'true',
        NO_COLOR: '1',
        FORCE_COLOR: '0',
      }),
    };

    this._pty = pty.spawn(command, args || [], spawnOptions);

    this._pty.onData((data) => {
      this._output += data;
      this._checkPromises();
    });

    this._pty.onExit(({ exitCode }) => {
      this._exited = true;
      this._exitCode = exitCode;
      this._checkPromises();
      this.emit('exit', exitCode);
    });

    return this;
  }

  _checkPromises() {
    this._promises = this._promises.filter((p) => {
      if (p._fulfilled) return false;
      if (p._check(this._output, this._exited, this._exitCode)) {
        p._fulfilled = true;
        if (p._resolve) p._resolve();
        return false;
      }
      return true;
    });
  }

  screen() {
    return this._output;
  }

  lastFrame() {
    return this._output;
  }

  newest(startPos) {
    return this._output.slice(startPos);
  }

  write(text) {
    if (this._pty) {
      this._pty.write(text);
    }
    return this;
  }

  key(name) {
    const keyMap = {
      enter: '\r',
      return: '\r',
      space: ' ',
      tab: '\t',
      escape: '\x1b',
      backspace: '\b',
      up: '\x1b[A',
      down: '\x1b[B',
      right: '\x1b[C',
      left: '\x1b[D',
      home: '\x1b[H',
      end: '\x1b[F',
      pgup: '\x1b[5~',
      pgdn: '\x1b[6~',
      ctrlA: '\x01',
      ctrlE: '\x05',
      ctrlL: '\x0c',
    };
    const char = keyMap[name] || name;
    this.write(char);
    return this;
  }

  type(text) {
    this.write(text);
    return this;
  }

  ctrlC() {
    this.write('\x03');
    return this;
  }

  resize(cols, rows) {
    this._cols = cols;
    this._rows = rows;
    if (this._pty) {
      this._pty.resize(cols, rows);
    }
    return this;
  }

  waitForText(text, timeout) {
    return this._wait((output) => {
      const idx = output.indexOf(text, this._matchedPos);
      if (idx >= 0) {
        this._matchedPos = idx + text.length;
        return true;
      }
      return false;
    }, `Timed out waiting for "${text}"`, timeout);
  }

  waitForSentinel(timeout) {
    this._sentinel = 'SENTINEL_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    this.write('\x1b[0m');
    return this.waitForText(this._sentinel, timeout);
  }

  waitForExit(timeout) {
    return this._wait(
      (_output, exited) => exited === true,
      'Timed out waiting for process exit',
      timeout
    );
  }

  waitForMatch(pattern, timeout) {
    return this._wait((output) => {
      const after = output.slice(this._matchedPos);
      const match = pattern.exec(after);
      if (match) {
        this._matchedPos += match.index + match[0].length;
        return true;
      }
      return false;
    }, `Timed out waiting for pattern ${pattern}`, timeout);
  }

  waitUntilIdle(timeout, stableMs) {
    const t = timeout || this._timeout;
    const stable = stableMs || 300;
    return new Promise((resolve, reject) => {
      const start = Date.now();
      let lastLen = this._output.length;
      let stableCount = 0;

      const timer = setInterval(() => {
        const now = Date.now();
        if (now - start > t) {
          clearInterval(timer);
          reject(new Error(
            `Timed out waiting for idle — last output:\n${this._output.slice(-2000)}\n` +
            `Output grew from ${lastLen} to ${this._output.length} chars`
          ));
          return;
        }
        const currentLen = this._output.length;
        if (currentLen === lastLen) {
          stableCount++;
          const needed = Math.ceil(stable / 100);
          if (stableCount >= needed) {
            clearInterval(timer);
            resolve();
          }
        } else {
          lastLen = currentLen;
          stableCount = 0;
        }
      }, 100);
    });
  }

  _wait(checkFn, errorMsg, timeout) {
    return new Promise((resolve, reject) => {
      if (checkFn(this._output, this._exited, this._exitCode)) {
        resolve();
        return;
      }

      const p = { _check: checkFn, _resolve: resolve, _fulfilled: false };
      this._promises.push(p);

      const timer = setTimeout(() => {
        p._fulfilled = true;
        const idx = this._promises.indexOf(p);
        if (idx >= 0) this._promises.splice(idx, 1);
        reject(new Error(`${errorMsg}\nNew output since last wait (${this.newest(this._matchedPos).length} chars):\n${this.newest(this._matchedPos).slice(-3000)}`));
      }, timeout);
      p._timer = timer;

      const origResolve = resolve;
      p._resolve = () => {
        clearTimeout(p._timer);
        origResolve();
      };
    });
  }

  get exitCode() {
    return this._exitCode;
  }

  get exited() {
    return this._exited;
  }

  kill() {
    if (this._pty) {
      this._pty.kill();
    }
  }

  dispose() {
    this.kill();
    this._promises = [];
    this.removeAllListeners();
  }
}

module.exports = { PtyDriver };
