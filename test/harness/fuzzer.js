'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { PtyDriver } = require('./pty-driver');
const { pathToCliArgs } = require('./path-enumerator');
const { validateAll } = require('./output-validator');

const BIN_PATH = path.join(__dirname, '../../bin/pasha.js');
const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');

const PRINTABLE_CHARS = (() => {
  const chars = [];
  for (let c = 32; c < 127; c++) chars.push(String.fromCharCode(c));
  return chars;
})();

const UNICODE_CHARS = [
  '\u4f60\u597d',    '\u4e16\u754c',     '\u306f\u3058\u3081',
  '\ud55c\uae00',     '\u03b1\u03b2\u03b3',
  '\u0627\u0644\u0633\u0644\u0627\u0645',
  '\u05e9\u05dc\u05d5\u05dd',
  '\u2620', '\u2708', '\u2603', '\u2728',
  '\u00e9', '\u00f1', '\u00fc', '\u00df',
  '\ub098\ub97c', '\u043f\u0440\u0438\u0432\u0435\u0442',
];

const SPECIAL_KEYS = [
  'enter', 'space', 'tab', 'escape',
  'up', 'down', 'left', 'right',
  'home', 'end', 'pgup', 'pgdn',
  'ctrlA', 'ctrlE', 'ctrlL',
];

const RESERVED_NAMES = [
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4',
  'lpt1', 'lpt2', 'lpt3',
];

const TRAVERSAL_NAMES = [
  '../../../etc/passwd',
  '..\\..\\windows\\system32',
  '/etc/shadow',
  '~/.ssh/id_rsa',
  './../..//../root',
  '.\\.\\..\\..\\windows',
];

const FUZZ_NAMES = [
  ...RESERVED_NAMES,
  ...TRAVERSAL_NAMES,
  ...UNICODE_CHARS.slice(0, 4),
  '  leading-whitespace',
  'trailing-whitespace  ',
  '  both-sides  ',
  '\t\ttabbed-name',
  '',
  'a'.repeat(250),
  '\x00null-byte',
  'name\nwith\nnewlines',
  'name\rwith\rcr',
  '🚀✨🎉',
  '\u200bzero-width-space',
  '-dash-start',
  '.dot-start',
  'two..dots',
  'space name',
  'question?mark',
  'star*glob',
  'bracket[test]',
];

const BASE_FUZZ_ARGS = [
  '--language', 'node',
  '--framework', 'express',
  '--architecture', 'hexagonal',
  '--orm', 'none',
  '--database', 'none',
  '--validation', 'none',
  '--broker', 'none',
  '--skip-install',
  '--skip-git',
  '--no-redis',
  '--no-agent-docs',
  '--extras', '',
  '--modules', 'product',
  '--yes',
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function sanitizeSnapshotName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 80);
}

class Fuzzer {
  constructor(opts = {}) {
    this._timeout = opts.timeout || 30000;
    this._outputDir = opts.outputDir || path.join(os.tmpdir(), 'pasha-fuzzer');
  }

  async fuzzKeyboard(driver, duration = 5000) {
    const startTime = Date.now();
    const keystrokeCount = { sent: 0, errors: 0 };
    const hrstart = process.hrtime();

    let lastHealthCheck = startTime;
    let lastOutputLen = 0;

    while (Date.now() - startTime < duration) {
      try {
        const actionType = randInt(0, 100);

        if (actionType < 50) {
          driver.write(randChoice(PRINTABLE_CHARS));
          keystrokeCount.sent++;
        } else if (actionType < 70) {
          driver.key(randChoice(SPECIAL_KEYS));
          keystrokeCount.sent++;
        } else if (actionType < 80) {
          driver.write(randChoice(UNICODE_CHARS));
          keystrokeCount.sent++;
        } else if (actionType < 85) {
          driver.ctrlC();
          keystrokeCount.sent++;
        } else if (actionType < 90) {
          const text = Array.from({ length: randInt(2, 15) }, () =>
            randChoice([...PRINTABLE_CHARS, ...UNICODE_CHARS])
          ).join('');
          driver.write(text);
          keystrokeCount.sent += text.length;
        } else if (actionType < 95) {
          driver.resize(randInt(40, 200), randInt(10, 60));
          keystrokeCount.sent++;
        } else {
          const burst = Array.from({ length: randInt(3, 30) }, () =>
            randChoice(PRINTABLE_CHARS)
          ).join('');
          driver.write(burst);
          keystrokeCount.sent += burst.length;
        }

        if (driver.exited) break;
      } catch (err) {
        keystrokeCount.errors++;
      }

      const now = Date.now();
      if (now - lastHealthCheck > 500) {
        lastHealthCheck = now;
        const currentLen = driver._output ? driver._output.length : 0;
        if (currentLen === lastOutputLen && currentLen > 0) {
          lastOutputLen = currentLen;
        } else {
          lastOutputLen = currentLen;
        }
      }

      await new Promise((r) => setTimeout(r, randInt(1, 25)));
    }

    const elapsed = process.hrtime(hrstart);
    const elapsedMs = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(1);

    return {
      duration: Number(elapsedMs),
      keystrokes: keystrokeCount.sent,
      errors: keystrokeCount.errors,
      crashed: driver.exited && driver.exitCode !== 0,
      exitCode: driver.exitCode,
      outputLen: driver.screen().length,
    };
  }

  async fuzzInputs() {
    const results = [];
    await fs.ensureDir(this._outputDir);

    for (let i = 0; i < FUZZ_NAMES.length; i++) {
      const fuzzName = FUZZ_NAMES[i];
      const result = {
        index: i,
        input: fuzzName.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '?'),
        inputLen: fuzzName.length,
        status: 'unknown',
        duration: 0,
        error: null,
      };

      const startTime = Date.now();

      try {
        let projName = fuzzName;

        if (fuzzName === '') {
          projName = 'empty-name-fallback';
        }

        const projDir = path.join(this._outputDir, projName.replace(/[/\\:*?"<>|]/g, '_'));
        await fs.remove(projDir).catch(() => {});

        const driver = new PtyDriver({ cols: 120, rows: 40, timeout: this._timeout });
        const cliArgs = ['create', ...BASE_FUZZ_ARGS, '--project-name', projName];

        driver.spawn('node', [BIN_PATH, ...cliArgs], this._outputDir);

        await driver.waitForExit(this._timeout);
        result.duration = Date.now() - startTime;
        result.exitCode = driver.exitCode;
        result.outputTail = driver.screen().split('\n').slice(-15).join('\n');

        if (driver.exitCode !== 0) {
          const screen = driver.screen();
          const hasClearError = /error|invalid|reject|fail|not\s+allowed|unsupported/i.test(screen);
          const isCrash = !hasClearError && /^\s*$/.test(screen);

          if (isCrash) {
            result.status = 'crash';
            result.error = 'Process exited with error but no clear rejection message';
          } else {
            result.status = 'rejected';
          }
        } else {
          if (await fs.pathExists(projDir)) {
            const files = await fs.readdir(projDir).catch(() => []);
            result.status = 'accepted';
            result.fileCount = files.length;
          } else {
            result.status = 'no-output';
            result.error = 'Exit 0 but no project directory created';
          }
        }

        driver.dispose();
        await fs.remove(projDir).catch(() => {});
      } catch (err) {
        result.duration = Date.now() - startTime;
        result.status = 'error';
        result.error = err.message;
      }

      results.push(result);
    }

    const summary = {
      total: results.length,
      accepted: results.filter((r) => r.status === 'accepted').length,
      rejected: results.filter((r) => r.status === 'rejected').length,
      crashed: results.filter((r) => r.status === 'crash').length,
      errors: results.filter((r) => r.status === 'error').length,
      noOutput: results.filter((r) => r.status === 'no-output').length,
    };

    return { results, summary };
  }

  async snapshotFrames(driver, testName) {
    const snapshots = {};
    const baseKey = sanitizeSnapshotName(testName || 'unnamed');
    await fs.ensureDir(SNAPSHOT_DIR);

    const saveFrame = (label) => {
      const screen = driver.screen();
      if (!screen || screen.length === 0) return null;

      const filename = `${baseKey}_${label}.txt`;
      const filePath = path.join(SNAPSHOT_DIR, filename);

      let prev = null;
      try {
        prev = fs.readFileSync(filePath, 'utf8');
      } catch (_) {}

      fs.writeFileSync(filePath, screen, 'utf8');

      const match = prev === screen;
      snapshots[label] = { file: filename, size: screen.length, match };
      return { file: filename, size: screen.length, match };
    };

    return {
      saveFrame,
      snapshots,
    };
  }
}

async function runKeyboardFuzz(duration, outputDir) {
  const tmpDir = outputDir || path.join(os.tmpdir(), 'pasha-keyboard-fuzz');
  await fs.ensureDir(tmpDir);
  const projDir = path.join(tmpDir, 'fuzz-keyboard');
  await fs.remove(projDir).catch(() => {});

  const driver = new PtyDriver({ cols: 120, rows: 40, timeout: 60000 });
  driver.spawn('node', [BIN_PATH, 'create'], tmpDir);

  try {
    await driver.waitForText('Welcome', 10000);
  } catch (_) {}

  const fuzzer = new Fuzzer();
  const result = await fuzzer.fuzzKeyboard(driver, duration);

  if (!driver.exited) {
    try {
      driver.ctrlC();
      await driver.waitForExit(5000);
    } catch (_) {
      driver.kill();
    }
  }

  await fs.remove(projDir).catch(() => {});
  driver.dispose();

  return result;
}

async function runInputFuzz(outputDir) {
  const fuzzer = new Fuzzer({ outputDir });
  return fuzzer.fuzzInputs();
}

async function runSnapshotFuzz(outputDir) {
  const tmpDir = outputDir || path.join(os.tmpdir(), 'pasha-snapshot-fuzz');
  await fs.ensureDir(tmpDir);
  const projDir = path.join(tmpDir, 'fuzz-snapshot');
  await fs.remove(projDir).catch(() => {});

  const driver = new PtyDriver({ cols: 120, rows: 40, timeout: 60000 });
  const fuzzer = new Fuzzer();
  const tracker = await fuzzer.snapshotFrames(driver, 'interactive-create');

  const cliArgs = ['create', ...BASE_FUZZ_ARGS, '--project-name', 'fuzz-snapshot'];
  driver.spawn('node', [BIN_PATH, ...cliArgs], tmpDir);

  let currentLabel = 'welcome';

  try {
    tracker.saveFrame('welcome');

    try {
      await driver.waitForText('What is your project name?', 10000);
      tracker.saveFrame('prompt-name');
    } catch (_) {}

    try {
      await driver.waitForExit(60000);
      tracker.saveFrame('done');
    } catch (_) {
      tracker.saveFrame('timeout');
    }
  } catch (_) {
    tracker.saveFrame('error');
  }

  const exitCode = driver.exitCode;
  driver.dispose();
  await fs.remove(projDir).catch(() => {});

  return {
    exitCode,
    snapshots: tracker.snapshots,
  };
}

module.exports = { Fuzzer, FUZZ_NAMES, runKeyboardFuzz, runInputFuzz, runSnapshotFuzz, BIN_PATH };
