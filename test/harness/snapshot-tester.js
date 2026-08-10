'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { PtyDriver } = require('./pty-driver');
const { enumerateSmoke, pathToCliArgs } = require('./path-enumerator');

const BIN_PATH = path.join(__dirname, '../../bin/pasha.js');
const GOLDEN_DIR = path.join(__dirname, 'snapshots', 'golden');
const DIFFS_DIR = path.join(__dirname, 'snapshots', 'diffs');
const REPORTS_DIR = path.join(__dirname, '../../test-reports');

const DEFAULT_TIMEOUT = 120000;

const ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const CURSOR_RE = /\r\x1b\[K/g;
const SPINNER_RE = /[\u2800-\u28FF] /g;

function sanitizeScreen(raw, outDir) {
  let s = raw;

  s = s.replace(ANSI_RE, '');
  s = s.replace(CURSOR_RE, '\n');
  s = s.replace(SPINNER_RE, '');

  s = s.replace(/\r\n/g, '\n');
  s = s.replace(/\r/g, '\n');

  if (outDir) {
    const escaped = outDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(escaped, 'g'), '<OUT_DIR>');
  }

  s = s.replace(/\/tmp\/[^\s\n]+/g, '<TMP_PATH>');
  s = s.replace(/\/home\/[^\s\n]+/g, '<HOME_PATH>');

  s = s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\s\n]*/g, '<ISO_DATE>');
  s = s.replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM|am|pm)?\b/g, '<TIME>');

  s = s.replace(/pasha-t-[a-z0-9-]+/g, '<PROJ_NAME>');

  s = s.split('\n').map(l => l.trimEnd()).join('\n');

  s = s.replace(/\n{3,}/g, '\n\n');

  return s;
}

function extractSections(screen) {
  const sections = {
    welcome: '',
    summary: '',
    done: '',
  };

  const lines = screen.split('\n');

  let inSummary = false;
  let summaryStart = -1;
  let summaryEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Configuration Summary')) {
      inSummary = true;
      summaryStart = i - 1;
    }
    if (inSummary && line.trim() === '' && summaryStart >= 0 && summaryEnd < 0) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() !== '') break;
        i = j;
      }
    }
    if (inSummary && line.includes('┘') || (inSummary && summaryStart >= 0 && summaryEnd < 0 && i - summaryStart > 3 && line.trim() === '')) {
      summaryEnd = i + 1;
      inSummary = false;
    }
    if (line.match(/Project (ready|creat)/i) && sections.done === '') {
      sections.done = lines.slice(i).join('\n');
    }
    if (line.match(/Welcome|Let's build|pasha.*generator/i) && sections.welcome === '') {
      sections.welcome = lines[i].trim();
    }
  }

  if (summaryStart >= 0 && summaryEnd >= 0) {
    sections.summary = lines.slice(summaryStart, summaryEnd).join('\n');
  }

  return sections;
}

function buildDiff(golden, current) {
  const lines = [];
  const gLines = (golden || '').split('\n');
  const cLines = (current || '').split('\n');
  const maxLen = Math.max(gLines.length, cLines.length);

  for (let i = 0; i < maxLen; i++) {
    const gLine = gLines[i];
    const cLine = cLines[i];

    if (gLine === undefined && cLine !== undefined) {
      lines.push(`+${i + 1}: ${cLine}`);
    } else if (cLine === undefined && gLine !== undefined) {
      lines.push(`-${i + 1}: ${gLine}`);
    } else if (gLine !== cLine) {
      lines.push(`-${i + 1}: ${gLine}`);
      lines.push(`+${i + 1}: ${cLine}`);
    }
  }

  return lines.join('\n');
}

class SnapshotTester {
  constructor(opts = {}) {
    this._timeout = opts.timeout || DEFAULT_TIMEOUT;
    this._updateSnapshots = opts.updateSnapshots || false;
    this._outputDir = opts.outputDir || path.join(os.tmpdir(), 'pasha-snaps');
    this._results = [];
  }

  async run() {
    console.log('=== pasha TUI Snapshot Tester ===');
    console.log('Mode:', this._updateSnapshots ? 'UPDATE' : 'VERIFY');
    console.log('Resolution: 80x24');
    console.log('');

    await fs.ensureDir(GOLDEN_DIR);
    await fs.ensureDir(DIFFS_DIR);
    await fs.ensureDir(REPORTS_DIR);

    const paths = await enumerateSmoke();
    console.log(`Enumerated ${paths.length} smoke test paths\n`);

    let passed = 0;
    let failed = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      const label = `[${i + 1}/${paths.length}] ${p.id}`;

      try {
        const result = await this._testPath(p);
        this._results.push(result);

        if (result.status === 'passed') {
          console.log(`  PASS ${label}  (${result.duration}ms)`);
          passed++;
        } else if (result.status === 'updated') {
          console.log(`  UPD  ${label}  (${result.duration}ms)`);
          updated++;
        } else if (result.status === 'failed') {
          console.log(`  FAIL ${label}  (${result.duration}ms)`);
          console.log(`       Diff: ${result.diffFile}`);
          failed++;
        } else {
          console.log(`  ERR  ${label}  ${result.error}`);
          errors++;
        }
      } catch (err) {
        this._results.push({ id: p.id, status: 'error', error: err.message });
        console.log(`  ERR  ${label}  ${err.message}`);
        errors++;
      }
    }

    return this._report({ passed, failed, updated, errors });
  }

  async _testPath(p) {
    const result = {
      id: p.id,
      status: 'unknown',
      duration: 0,
      diffFile: null,
      error: null,
    };

    const projDir = path.join(this._outputDir, p.projectName.replace(/[/\\:*?"<>|]/g, '_'));
    const startTime = Date.now();

    try {
      await fs.ensureDir(this._outputDir);
      await fs.remove(projDir).catch(() => {});

      const driver = new PtyDriver({ cols: 80, rows: 24, timeout: this._timeout });
      const args = pathToCliArgs(p).concat(['--project-name', p.projectName]);

      driver.spawn('node', [BIN_PATH, ...args], this._outputDir);
      await driver.waitForExit(this._timeout);

      result.duration = Date.now() - startTime;
      result.exitCode = driver.exitCode;

      const rawScreen = driver.screen();
      const screen = sanitizeScreen(rawScreen, this._outputDir);

      driver.dispose();

      const safeId = p.id.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      const goldenFile = path.join(GOLDEN_DIR, `${safeId}.txt`);

      let golden = null;
      try {
        golden = await fs.readFile(goldenFile, 'utf8');
      } catch (_) {}

      if (this._updateSnapshots || golden === null) {
        await fs.writeFile(goldenFile, screen, 'utf8');
        result.status = golden === null ? 'updated' : 'updated';
        result.screen = screen;
        return result;
      }

      if (screen === golden) {
        result.status = 'passed';
        return result;
      }

      const diff = buildDiff(golden, screen);
      const diffFile = path.join(DIFFS_DIR, `${safeId}.diff`);
      await fs.writeFile(diffFile, diff, 'utf8');
      result.status = 'failed';
      result.diffFile = diffFile;
      result.screen = screen;
      result.golden = golden;
    } catch (err) {
      result.status = 'error';
      result.error = err.message;
    } finally {
      await fs.remove(projDir).catch(() => {});
    }

    return result;
  }

  _report(summary) {
    const total = this._results.length;
    const duration = this._results.reduce((s, r) => s + (r.duration || 0), 0);

    const report = {
      timestamp: new Date().toISOString(),
      mode: this._updateSnapshots ? 'update' : 'verify',
      summary: Object.assign({ total }, summary),
      results: this._results.map(r => ({
        id: r.id,
        status: r.status,
        exitCode: r.exitCode,
        duration: r.duration,
        diffFile: r.diffFile,
        error: r.error,
      })),
    };

    const reportPath = path.join(REPORTS_DIR, `snapshot-${Date.now()}.json`);
    fs.writeJsonSync(reportPath, report, { spaces: 2 });

    console.log(`\n=== Snapshot Report ===`);
    console.log(`Total: ${total}  Passed: ${summary.passed}  Failed: ${summary.failed}  Updated: ${summary.updated}  Errors: ${summary.errors}`);
    console.log(`Total duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Report: ${reportPath}`);

    return report;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const updateSnapshots = args.includes('--update-snapshots') || args.includes('-u');

  const tester = new SnapshotTester({ updateSnapshots });
  const report = await tester.run();

  const failed = report.summary.failed || 0;
  const errors = report.summary.errors || 0;
  process.exit(failed + errors > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

module.exports = { SnapshotTester, sanitizeScreen, buildDiff };
