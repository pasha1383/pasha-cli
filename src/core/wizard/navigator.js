'use strict';

class Navigator {
  /**
   * @param {Array<{name: string, label: string, run: Function}>} steps
   *   run(ctx, nav) => partial-ctx | null | '__back__' | '__skip__' | '__confirm__'
   */
  constructor(steps) {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Navigator requires a non-empty array of steps');
    }
    for (const s of steps) {
      if (!s.name || !s.run || typeof s.run !== 'function') {
        throw new Error(`Step "${s.name || '?'}" is missing a name or run function`);
      }
    }

    this._steps = steps;
    this._currentIndex = 0;
    this._ctx = {};
    this._history = [];
    this._pendingAction = null;
    this._visitCount = new Map();
    this._errorHandler = null;
    this._loopGuardHandler = null;
    this._retrySkipHandler = null;
  }

  get totalSteps() {
    return this._steps.length;
  }

  get currentIndex() {
    return this._currentIndex;
  }

  get currentStep() {
    return this._steps[this._currentIndex] || null;
  }

  setErrorHandler(fn) {
    this._errorHandler = fn;
  }

  setLoopGuardHandler(fn) {
    this._loopGuardHandler = fn;
  }

  setRetrySkipHandler(fn) {
    this._retrySkipHandler = fn;
  }

  goBack() {
    if (this._currentIndex > 0) {
      this._pendingAction = 'back';
      return true;
    }
    return false;
  }

  goForward() {
    if (this._currentIndex < this._steps.length - 1) {
      this._pendingAction = 'forward';
      return true;
    }
    return false;
  }

  async start(initialCtx = {}) {
    const baseCtx = { ...initialCtx };
    this._ctx = { ...initialCtx };
    this._currentIndex = 0;
    this._history = [];
    this._pendingAction = null;

    while (this._currentIndex < this._steps.length) {
      const step = this._steps[this._currentIndex];

      // Loop guard: if we visit the same step too many times, the wizard has a bug
      const key = step.name;
      const count = (this._visitCount.get(key) || 0) + 1;
      this._visitCount.set(key, count);
      if (count > 20) {
        const msg = `Navigator loop detected on step "${step.label}" (visited ${count} times). ` +
          `This is a bug in the wizard — accumulated answers: ${JSON.stringify(Object.keys(this._ctx))}`;
        if (this._loopGuardHandler) {
          this._loopGuardHandler(msg);
        } else {
          console.warn(msg);
        }
        break;
      }

      this._pendingAction = null;

      try {
        const result = await step.run(this._ctx, this);

        if (this._pendingAction === 'back' || result === '__back__') {
          if (this._currentIndex === 0) {
            continue;
          }
          this._clearFromCurrent(baseCtx);
          this._currentIndex = Math.max(0, this._currentIndex - 1);
          continue;
        }

        if (this._pendingAction === 'forward' || result === '__skip__') {
          this._currentIndex++;
          continue;
        }

        if (this._isReviewStep()) {
          if (result === '__confirm__' || result === true) {
            break;
          }
          if (result === '__back__') {
            this._clearFromCurrent(baseCtx);
            this._currentIndex = Math.max(0, this._currentIndex - 1);
            continue;
          }
        }

        if (result && typeof result === 'object' && !Array.isArray(result)) {
          Object.assign(this._ctx, result);
        }

        this._history = this._history.filter(h => h.name !== step.name);

        this._history.push({
          name: step.name,
          label: step.label,
          result: result && typeof result === 'object' ? { ...result } : result,
          timestamp: Date.now(),
        });

        this._currentIndex++;

      } catch (err) {
        if (err.name === 'ExitPromptError') {
          this._ctx._cancelled = true;
          if (this._errorHandler) {
            this._errorHandler('exit');
          }
          break;
        }

        if (this._errorHandler) {
          this._errorHandler('step_error', err, step.label);
        } else {
          console.error(`\nError in step "${step.label}" — ${err.message}`);
        }

        const action = await this._askRetrySkip();
        if (action === 'retry') {
          continue;
        }
        if (action === 'exit') {
          process.exit(0);
        }

        if (this._errorHandler) {
          this._errorHandler('info', 'Skipping step — the project may be incomplete.');
        } else {
          console.log('Skipping step — the project may be incomplete.');
        }
        this._currentIndex++;
      }
    }

    return this._ctx;
  }

  _isReviewStep() {
    return this._currentIndex === this._steps.length - 1;
  }

  _clearFromCurrent(baseCtx) {
    const clearFrom = this._currentIndex;
    this._history = this._history.filter(h => {
      const idx = this._steps.findIndex(s => s.name === h.name);
      return idx < clearFrom || idx === -1;
    });

    this._ctx = { ...baseCtx };
    for (const entry of this._history) {
      if (entry.result && typeof entry.result === 'object' && !Array.isArray(entry.result)) {
        Object.assign(this._ctx, entry.result);
      }
    }
  }

  async _askRetrySkip() {
    const io = require('../../ui/io');
    let isTui = false;
    try {
      const { isTuiMode } = require('../../ui/prompts');
      isTui = isTuiMode();
    } catch (_) { /* prompts module not loaded */ }

    if (isTui) {
      if (this._retrySkipHandler) {
        return await this._retrySkipHandler();
      }
      return 'skip';
    }

    io.writeLine('\n[enter] Skip  [r] Retry  (default: skip):');
    return new Promise((resolve) => {
      const stdin = io.getIO().input;
      const stdout = io.getIO().output;
      if (stdin.isTTY) stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      const handler = (key) => {
        if (stdin.isTTY) stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', handler);
        stdout.write('\n');
        if (key === '\r' || key === '\n' || key === 's' || key === 'S' || key === '\u0003') {
          resolve(key === '\u0003' ? 'exit' : 'skip');
        } else if (key === 'r' || key === 'R') {
          resolve('retry');
        } else {
          resolve('skip');
        }
      };
      stdin.on('data', handler);
    });
  }
}

module.exports = { Navigator };
