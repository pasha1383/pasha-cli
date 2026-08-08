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
  }

  // ---- public getters ----

  get totalSteps() {
    return this._steps.length;
  }

  get currentIndex() {
    return this._currentIndex;
  }

  get currentStep() {
    return this._steps[this._currentIndex] || null;
  }

  // ---- navigation methods callable from inside step.run() ----

  /**
   * Signal the wizard to go back one step after run() returns.
   * @returns {boolean} true if back is possible, false if already at the first step
   */
  goBack() {
    if (this._currentIndex > 0) {
      this._pendingAction = 'back';
      return true;
    }
    return false;
  }

  /**
   * Signal the wizard to skip to the next step after run() returns.
   * @returns {boolean} true if forward is possible, false if already at the last step
   */
  goForward() {
    if (this._currentIndex < this._steps.length - 1) {
      this._pendingAction = 'forward';
      return true;
    }
    return false;
  }

  // ---- main entry point ----

  /**
   * Runs the wizard from scratch (or from a previously-saved context).
   * @param {object} [initialCtx={}]  base context to seed the wizard
   * @returns {Promise<object>}  the final accumulated context
   */
  async start(initialCtx = {}) {
    const baseCtx = { ...initialCtx };
    this._ctx = { ...initialCtx };
    this._currentIndex = 0;
    this._history = [];
    this._pendingAction = null;

    while (this._currentIndex < this._steps.length) {
      const step = this._steps[this._currentIndex];
      this._pendingAction = null;

      try {
        const result = await step.run(this._ctx, this);

        // --- back navigation (goBack() called or step returned '__back__') ---
        if (this._pendingAction === 'back' || result === '__back__') {
          this._clearFromCurrent(baseCtx);
          this._currentIndex = Math.max(0, this._currentIndex - 1);
          continue;
        }

        // --- skip / forward (goForward() called or step returned '__skip__') ---
        if (this._pendingAction === 'forward' || result === '__skip__') {
          this._currentIndex++;
          continue;
        }

        // --- review step (last in the array) special handling ---
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

        // --- normal result: merge partial context ---
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          Object.assign(this._ctx, result);
        }

        // Remove any previous entry for this step (handles re-runs after back navigation)
        this._history = this._history.filter(h => h.name !== step.name);

        this._history.push({
          name: step.name,
          label: step.label,
          result: result && typeof result === 'object' ? { ...result } : result,
          timestamp: Date.now(),
        });

        this._currentIndex++;

      } catch (err) {
        console.error(`\n❌ Error in step "${step.label}" — ${err.message}`);
        const action = await this._askRetrySkip();
        if (action === 'retry') {
          continue;
        }
        this._currentIndex++;
      }
    }

    return this._ctx;
  }

  // ---- internals ----

  _isReviewStep() {
    return this._currentIndex === this._steps.length - 1;
  }

  /**
   * Clear results from the current step and all subsequent steps,
   * then rebuild context from the remaining history.
   */
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

  _askRetrySkip() {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise(resolve => {
      readline.question('\n[r] Retry  [s] Skip  (default: s): ', answer => {
        readline.close();
        resolve((answer || '').trim().toLowerCase() === 'r' ? 'retry' : 'skip');
      });
    });
  }
}

module.exports = { Navigator };
