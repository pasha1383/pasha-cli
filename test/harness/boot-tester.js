'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const http = require('http');
const { execSync, spawn, exec } = require('child_process');

const BIN_PATH = path.join(__dirname, '../../bin/pasha.js');
const REPORTS_DIR = path.join(__dirname, '../../test-reports');
const DEFAULT_TIMEOUT = 120000;

function parseArgs(argv) {
  const args = {
    docker: false,
    framework: null,
    timeout: DEFAULT_TIMEOUT,
  };

  for (const a of argv) {
    if (a === '--docker') args.docker = true;
    if (a.startsWith('--framework=')) args.framework = a.split('=')[1];
    if (a.startsWith('--timeout=')) {
      const v = parseInt(a.split('=')[1], 10);
      if (!isNaN(v) && v > 0) args.timeout = v;
    }
  }

  return args;
}

function checkCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkDockerAvailable() {
  try {
    execSync('docker info', { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function pollHealth(url, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const attempt = () => {
      const req = http.get(url, { timeout: 5000 }, (res) => {
        if (res.statusCode === 200) {
          resolve();
          return;
        }
        res.resume();
        scheduleNext();
      });
      req.on('error', () => scheduleNext());
      req.on('timeout', () => {
        req.destroy();
        scheduleNext();
      });
    };

    const scheduleNext = () => {
      if (Date.now() - start >= timeout) {
        reject(new Error(`Health check timed out after ${timeout}ms at ${url}`));
        return;
      }
      setTimeout(attempt, 1000);
    };

    attempt();
  });
}

function spawnWithTimeout(command, args, opts, timeout) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, Object.assign({ stdio: 'pipe' }, opts));
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Timed out after ${timeout}ms: ${command} ${args.join(' ')}`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(`${command} ${args.join(' ')} failed (exit ${code}): ${stderr.slice(-500)}`);
        err.exitCode = code;
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function killProcess(child) {
  if (!child || child.killed) return;
  try {
    child.kill('SIGTERM');
    setTimeout(() => {
      try { if (!child.killed) child.kill('SIGKILL'); } catch (_) {}
    }, 5000);
  } catch (_) {}
}

async function runCli(cwd, extraArgs) {
  const args = [BIN_PATH, 'create', '--yes', '--skip-install', '--skip-git', ...extraArgs];
  return spawnWithTimeout('node', args, { cwd }, DEFAULT_TIMEOUT);
}

function getHealthPaths(language, framework) {
  if (language === 'python') {
    return ['/health', '/health/'];
  }
  return ['/health'];
}

function buildCliArgs(combo) {
  const args = [
    '--language', combo.language,
    '--framework', combo.framework,
    '--architecture', combo.architecture,
    '--orm', combo.orm,
    '--database', combo.database,
    '--modules', combo.modules || 'product',
    '--project-name', combo.projectName,
    '--extras', (combo.extras || ['swagger', 'lint', 'tests', 'health']).join(','),
  ];

  if (combo.extraArgs) {
    for (const [k, v] of Object.entries(combo.extraArgs)) {
      args.push(k, v);
    }
  }

  return args;
}

function getInstallCommand(language) {
  if (language === 'python') return { cmd: 'pip', args: ['install', '-r', 'requirements.txt'] };
  if (language === 'go') return { cmd: 'go', args: ['mod', 'tidy'] };
  return null;
}

function getMigrateCommand(combo, projDir) {
  const ld = combo.language;
  const fw = combo.framework;
  const db = combo.database;

  if (ld === 'node') {
    if (combo.orm === 'prisma') {
      return { cmd: 'npx', args: ['prisma', 'migrate', 'dev', '--name', 'boottest'] };
    }
    if (combo.orm === 'typeorm') {
      return { cmd: 'npx', args: ['typeorm-ts-node-commonjs', 'migration:run', '-d', 'src/shared/database/typeorm.datasource.ts'] };
    }
  }

  if (ld === 'python') {
    if (fw === 'django') {
      return { cmd: 'python3', args: ['manage.py', 'migrate'] };
    }
    if (combo.orm === 'sqlalchemy') {
      return null;
    }
  }

  if (ld === 'go') {
    return null;
  }

  return null;
}

function getStartCommand(combo, projDir) {
  const ld = combo.language;
  const fw = combo.framework;

  if (ld === 'node') {
    return { cmd: 'npm', args: ['run', 'start:dev'] };
  }

  if (ld === 'go') {
    return { cmd: 'go', args: ['run', 'cmd/main.go'] };
  }

  if (ld === 'python') {
    if (fw === 'django') {
      return { cmd: 'python3', args: ['manage.py', 'runserver', `0.0.0.0:${combo.port}`] };
    }
    return { cmd: 'uvicorn', args: ['src.app:app', '--host', '0.0.0.0', '--port', String(combo.port)] };
  }

  return null;
}

function needsDocker(combo) {
  const db = combo.database;
  return db === 'postgres' || db === 'mysql' || db === 'mongo';
}

function getDockerComposeCommand(combo, projDir, action) {
  const v1Path = path.join(projDir, 'docker-compose.yml');
  const v2Path = path.join(projDir, 'compose.yaml');

  return async function runDocker() {
    const composeFile = (await fs.pathExists(v2Path)) ? 'compose.yaml' : (await fs.pathExists(v1Path)) ? 'docker-compose.yml' : null;
    if (!composeFile) throw new Error('No docker-compose file found');

    const isUp = action === 'up';
    try {
      const sub = ['compose', '-f', composeFile, isUp ? 'up' : 'down'];
      if (isUp) sub.push('-d');
      await spawnWithTimeout('docker', sub, { cwd: projDir }, 60000);
    } catch (err) {
      try {
        const sub = ['-compose', '-f', composeFile, isUp ? 'up' : 'down'];
        if (isUp) sub.push('-d');
        await spawnWithTimeout('docker-compose', [sub[0].slice(1)], sub.slice(1), { cwd: projDir }, 60000);
      } catch (err2) {
        throw new Error(`docker compose failed: ${err2.message}`);
      }
    }
  };
}

function makeResult(combo, status, reason, duration, extra) {
  return Object.assign({
    id: combo.id,
    framework: `${combo.language}/${combo.framework}/${combo.architecture}/${combo.orm}/${combo.database}`,
    status,
    reason,
    duration,
  }, extra || {});
}

async function bootTest(combo, opts, tempRoot) {
  const startTime = Date.now();
  const projDir = path.join(tempRoot, combo.projectName);
  let serverProc = null;

  try {
    console.log(`\n--- Boot test: ${combo.id} ---`);

    if (needsDocker(combo) && !opts.docker) {
      return makeResult(combo, 'skipped', 'Docker required but --docker not passed (use --docker to enable)');
    }

    if (needsDocker(combo) && !checkDockerAvailable()) {
      return makeResult(combo, 'skipped', 'Docker not available on this host');
    }

    if (combo.language === 'go' && !checkCommand('go')) {
      return makeResult(combo, 'skipped', 'Go toolchain not available (missing "go" command)');
    }

    if (combo.language === 'python' && !checkCommand('python3')) {
      return makeResult(combo, 'skipped', 'Python3 not available (missing "python3" command)');
    }

    await fs.remove(projDir).catch(() => {});

    console.log(`  [1/7] Generating project...`);
    await runCli(tempRoot, buildCliArgs(combo));

    if (!(await fs.pathExists(projDir))) {
      return makeResult(combo, 'failed', `Project directory not created: ${projDir}`);
    }

    const envExample = path.join(projDir, '.env.example');
    const envFile = path.join(projDir, '.env');
    if (await fs.pathExists(envExample)) {
      await fs.copy(envExample, envFile);
    }

    if (needsDocker(combo) && opts.docker) {
      console.log(`  [2/7] Starting docker-compose services...`);
      const dockerUp = getDockerComposeCommand(combo, projDir, 'up');
      await dockerUp();
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      console.log(`  [2/7] No docker services needed`);
    }

    const installCmd = getInstallCommand(combo.language);
    if (installCmd) {
      console.log(`  [3/7] Installing dependencies (${installCmd.cmd} ${installCmd.args.join(' ')})...`);
      try {
        await spawnWithTimeout(installCmd.cmd, installCmd.args, { cwd: projDir }, 120000);
      } catch (err) {
        return makeResult(combo, 'failed', `Dependency install failed: ${err.message}`);
      }
    } else if (combo.language === 'node') {
      console.log(`  [3/7] Installing npm dependencies...`);
      try {
        await spawnWithTimeout('npm', ['install'], { cwd: projDir }, 120000);
      } catch (err) {
        return makeResult(combo, 'failed', `npm install failed: ${err.message}`);
      }
    } else {
      console.log(`  [3/7] No dependency install needed`);
    }

    const migrateCmd = getMigrateCommand(combo, projDir);
    if (migrateCmd) {
      console.log(`  [4/7] Running migrations...`);
      try {
        await spawnWithTimeout(migrateCmd.cmd, migrateCmd.args, { cwd: projDir }, 60000);
      } catch (err) {
        if (!err.message.includes('Prisma schema') && !err.message.includes('already exists')) {
          return makeResult(combo, 'failed', `Migration failed: ${err.message}`);
        }
        console.log(`  (migration warning, continuing: ${err.message.slice(0, 120)})`);
      }
    } else {
      console.log(`  [4/7] No migrations needed`);
    }

    const startCmd = getStartCommand(combo, projDir);
    if (!startCmd) {
      return makeResult(combo, 'failed', `No start command configured for ${combo.id}`);
    }

    console.log(`  [5/7] Starting server (${startCmd.cmd} ${startCmd.args.join(' ')})...`);
    serverProc = spawn(startCmd.cmd, startCmd.args, {
      cwd: projDir,
      stdio: 'pipe',
      env: Object.assign({}, process.env, { CI: 'true', NO_COLOR: '1' }),
    });

    let serverStderr = '';
    serverProc.stderr.on('data', (d) => { serverStderr += d.toString(); });

    console.log(`  [6/7] Polling health endpoint on port ${combo.port}...`);
    const healthPaths = getHealthPaths(combo.language, combo.framework);
    let healthOk = false;

    for (const hp of healthPaths) {
      const url = `http://localhost:${combo.port}${hp}`;
      try {
        await pollHealth(url, opts.timeout);
        healthOk = true;
        console.log(`  Health OK: ${url}`);
        break;
      } catch (err) {
        console.log(`  ${url} not responding: ${err.message.slice(0, 80)}`);
      }
    }

    if (!healthOk) {
      return makeResult(combo, 'failed', `Health check failed on all paths. Server stderr: ${serverStderr.slice(-500)}`);
    }

    const duration = Date.now() - startTime;
    return makeResult(combo, 'passed', 'OK', duration);

  } catch (err) {
    const duration = Date.now() - startTime;
    return makeResult(combo, 'failed', err.message, duration);
  } finally {
    console.log('  [7/7] Tearing down...');

    if (serverProc) {
      killProcess(serverProc);
      serverProc = null;
    }

    if (needsDocker(combo) && opts.docker) {
      try {
        const dockerDown = getDockerComposeCommand(combo, path.join(tempRoot, combo.projectName), 'down');
        await dockerDown();
      } catch (_) {}
    }

    try {
      await fs.remove(path.join(tempRoot, combo.projectName)).catch(() => {});
    } catch (_) {}
  }
}

const COMBINATIONS = [
  {
    id: 'node-nestjs-layered-prisma-postgres',
    language: 'node',
    framework: 'nestjs',
    architecture: 'layered',
    orm: 'prisma',
    database: 'postgres',
    port: 3000,
    modules: 'product',
    extras: ['swagger', 'lint', 'tests', 'health'],
    projectName: 'boottest-nestjs-pg',
  },
  {
    id: 'node-express-layered-typeorm-mysql',
    language: 'node',
    framework: 'express',
    architecture: 'layered',
    orm: 'typeorm',
    database: 'mysql',
    port: 3000,
    modules: 'product',
    extras: ['swagger', 'lint', 'tests', 'health'],
    projectName: 'boottest-express-mysql',
  },
  {
    id: 'go-gin-layered-gorm-sqlite',
    language: 'go',
    framework: 'gin',
    architecture: 'layered',
    orm: 'gorm',
    database: 'sqlite',
    port: 8080,
    modules: 'product',
    extras: ['swagger', 'lint', 'tests', 'health'],
    projectName: 'boottest-gin-sqlite',
  },
  {
    id: 'python-fastapi-layered-sqlalchemy-sqlite',
    language: 'python',
    framework: 'fastapi',
    architecture: 'layered',
    orm: 'sqlalchemy',
    database: 'sqlite',
    port: 8000,
    modules: 'product',
    extras: ['swagger', 'lint', 'tests', 'health'],
    projectName: 'boottest-fastapi-sqlite',
  },
  {
    id: 'python-django-mvc-djangoorm-sqlite',
    language: 'python',
    framework: 'django',
    architecture: 'mvc',
    orm: 'django',
    database: 'sqlite',
    port: 8000,
    modules: 'product',
    extras: ['swagger', 'lint', 'tests', 'health'],
    projectName: 'boottest-django-sqlite',
  },
];

async function run(opts) {
  console.log('=== pasha Boot Tester ===');
  console.log('Docker:', opts.docker ? 'enabled' : 'disabled');
  console.log('Timeout:', opts.timeout, 'ms');
  console.log('');

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pasha-boot-'));
  const results = [];
  const combinations = opts.framework
    ? COMBINATIONS.filter((c) => c.id.includes(opts.framework))
    : COMBINATIONS;

  console.log(`Testing ${combinations.length} combination(s)\n`);

  for (const combo of combinations) {
    const result = await bootTest(combo, opts, tempRoot);
    results.push(result);
    console.log(`  ${result.status === 'passed' ? 'PASS' : result.status === 'skipped' ? 'SKIP' : 'FAIL'} — ${result.framework}  (${result.duration || 0}ms)  ${result.reason || ''}`);
  }

  await fs.remove(tempRoot).catch(() => {});

  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  const report = {
    timestamp: new Date().toISOString(),
    docker: opts.docker,
    timeout: opts.timeout,
    summary: { total: results.length, passed, failed, skipped },
    results,
  };

  await fs.ensureDir(REPORTS_DIR);
  const reportPath = path.join(REPORTS_DIR, `boot-${Date.now()}.json`);
  await fs.writeJson(reportPath, report, { spaces: 2 });

  console.log(`\n=== Report ===`);
  console.log(`Total: ${results.length}  Passed: ${passed}  Failed: ${failed}  Skipped: ${skipped}`);
  console.log(`Report saved: ${reportPath}`);

  const skippedCombos = results.filter((r) => r.status === 'skipped');
  if (skippedCombos.length > 0) {
    console.log(`\nUnverified (skipped) frameworks:`);
    for (const s of skippedCombos) {
      console.log(`  - ${s.framework}: ${s.reason}`);
    }
  }

  console.log('\nNOTE: Run nightly rather than per-commit.');

  return report;
}

module.exports = { run, bootTest, COMBINATIONS };

if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2));

  run(opts).then((report) => {
    process.exit(report.summary.failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Boot tester fatal error:', err);
    process.exit(1);
  });
}
