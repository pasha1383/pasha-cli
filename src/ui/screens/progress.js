'use strict';

const io = require('../io');

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

class Spinner {
  constructor(text) {
    this.text = text || '';
    this._interval = null;
    this._frame = 0;
  }

  start(text) {
    if (text) this.text = text;
    if (!this._shouldAnimate()) {
      io.writeLine(`  … ${this.text}`);
      return this;
    }
    this._interval = setInterval(() => {
      io.write(`\r  ${SPINNER_FRAMES[this._frame]} ${this.text}`);
      this._frame = (this._frame + 1) % SPINNER_FRAMES.length;
    }, 80);
    return this;
  }

  succeed(text) {
    this.stop();
    if (this._shouldAnimate()) {
      io.write(`\r  ✓ ${text || this.text}\n`);
    } else {
      io.writeLine(`  ✓ ${text || this.text}`);
    }
    return this;
  }

  fail(text) {
    this.stop();
    if (this._shouldAnimate()) {
      io.write(`\r  ✗ ${text || this.text}\n`);
    } else {
      io.writeLine(`  ✗ ${text || this.text}`);
    }
    return this;
  }

  warn(text) {
    this.stop();
    io.writeLine(`  ! ${text || this.text}`);
    return this;
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
      if (this._shouldAnimate()) io.write('\r');
    }
  }

  _shouldAnimate() {
    return io.isTTY() && !process.env.CI && !process.env.NO_COLOR && !io.isPlainMode();
  }
}

module.exports = { Spinner };
