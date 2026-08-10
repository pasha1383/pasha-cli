'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { PtyDriver } = require('./pty-driver');
const { enumerateSmoke, enumerateFull, pathToCliArgs } = require('./path-enumerator');
const { validateAll, validateManifest } = require('./output-validator');

const BIN_PATH = path.join(__dirname, '../../bin/pasha.js');
const TEMPLATES_ROOT = path.join(__dirname, '../../templates');
const REPORTS_DIR = path.join(__dirname, '../../test-reports');

const DEFAULT_TIMEOUT = 120000;

class Walker {
  constructor(opts = {}) {
    this._timeout = opts.timeout || DEFAULT_TIMEOUT;
    this._concurrency = opts.concurrency || 1;
    this._smokeOnly = opts.smoke || false;
    this._outputDir = opts.outputDir || path.join(os.tmpdir(), 'pasha-walker');
    this._results = [];
    this._startTime = null;
  }

  async run() {
    this._startTime = Date.now();
    console.log('=== pasha TUI Walker ===');
    console.log('Mode:', this._smokeOnly ? 'SMOKE' : 'FULL');
    console.log('Output dir:', this._outputDir);

    await fs.ensureDir(this._outputDir);
    await fs.ensureDir(REPORTS_DIR);

    const paths = this._smokeOnly ? await enumerateSmoke() : await enumerateFull();
    console.log(`\nEnumerated ${paths.length} test paths`);

    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      const result = await this._runPath(p, i, paths.length);
      this._results.push(result);
      this._printResult(result);
    }

    return this._report();
  }

  async _runPath(p, index, total) {
    const result = {
      index,
      total,
      id: p.id,
      path: p,
      status: 'pending',
      exitCode: null,
      duration: 0,
      errors: [],
      validation: null,
    };

    const projDir = path.join(this._outputDir, p.projectName);
    const startTime = Date.now();

    try {
      await fs.remove(projDir).catch(() => {});

      const driver = new PtyDriver({ cols: 120, rows: 40, timeout: this._timeout });
      const args = pathToCliArgs(p).concat(['--project-name', p.projectName]);

      driver.spawn('node', [BIN_PATH, ...args], this._outputDir);

      await driver.waitForExit(this._timeout);
      result.exitCode = driver.exitCode;
      result.duration = Date.now() - startTime;
      result.rawOutput = driver.screen();

      if (driver.exitCode !== 0) {
        result.status = 'failed';
        const lastLines = driver.screen().split('\n').slice(-20).join('\n');
        result.errors.push({ type: 'exit-code', message: `Exit code ${driver.exitCode}`, output: lastLines });
      } else {
        if (await fs.pathExists(projDir)) {
          try {
            const vResult = await validateAll(projDir, p);
            result.validation = vResult;
            const allPassed = vResult.summary.failed === 0;
            result.status = allPassed ? 'passed' : 'failed';
            if (!allPassed) {
              for (const [checkName, check] of Object.entries(vResult.checks)) {
                if (!check.passed && Array.isArray(check.details)) {
                  for (const d of check.details.slice(0, 5)) {
                    result.errors.push({
                      type: checkName,
                      message: d.file ? `${d.file}: ${d.reason || d.error || ''}` : JSON.stringify(d),
                    });
                  }
                }
              }
            }
          } catch (err) {
            result.status = 'failed';
            result.errors.push({ type: 'validation-error', message: err.message });
          }
        } else {
          result.status = 'failed';
          result.errors.push({ type: 'missing-output', message: `Project directory not created: ${projDir}` });
        }
      }

      driver.dispose();
    } catch (err) {
      result.status = 'error';
      result.duration = Date.now() - startTime;
      result.errors.push({ type: 'harness-error', message: err.message });
    }

    try { await fs.remove(projDir).catch(() => {}); } catch (_) {}

    return result;
  }

  _printResult(result) {
    const icon = result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '?';
    console.log(`  ${icon} [${result.index + 1}/${result.total}] ${result.id}  (${result.duration}ms)`);
    if (result.errors.length > 0) {
      for (const err of result.errors.slice(0, 2)) {
        console.log(`      ${err.type}: ${err.message.substring(0, 120)}`);
      }
    }
  }

  _report() {
    const total = this._results.length;
    const passed = this._results.filter(r => r.status === 'passed').length;
    const failed = this._results.filter(r => r.status === 'failed').length;
    const errors = this._results.filter(r => r.status === 'error').length;
    const duration = Date.now() - this._startTime;

    const report = {
      timestamp: new Date().toISOString(),
      mode: this._smokeOnly ? 'smoke' : 'full',
      duration,
      summary: { total, passed, failed, errors },
      results: this._results.map(r => ({
        id: r.id,
        status: r.status,
        exitCode: r.exitCode,
        duration: r.duration,
        errorCount: r.errors.length,
        errors: r.errors.slice(0, 10),
        validationSummary: r.validation ? r.validation.summary : null,
      })),
    };

    const reportPath = path.join(REPORTS_DIR, `walker-${Date.now()}.json`);
    fs.writeJsonSync(reportPath, report, { spaces: 2 });

    console.log(`\n=== Report ===`);
    console.log(`Total: ${total}  Passed: ${passed}  Failed: ${failed}  Errors: ${errors}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Report saved: ${reportPath}`);

    return report;
  }
}

async function runSmoke() {
  const walker = new Walker({ smoke: true, concurrency: 1 });
  return walker.run();
}

async function runFull() {
  const walker = new Walker({ smoke: false, concurrency: 1 });
  return walker.run();
}

module.exports = { Walker, runSmoke, runFull, BIN_PATH };

if (require.main === module) {
  const smoke = process.argv.includes('--smoke') || !process.argv.includes('--full');
  const fn = smoke ? runSmoke : runFull;
  fn().then(report => {
    process.exit(report.summary.failed + report.summary.errors > 0 ? 1 : 0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
