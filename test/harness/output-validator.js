'use strict';

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.gz', '.tar', '.tgz', '.7z', '.rar',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm',
  '.exe', '.dll', '.so', '.dylib', '.wasm',
]);

const SOURCE_EXTS_BY_LANG = {
  node: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py'],
  go: ['.go'],
};

const IMAGE_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
]);

async function listAllFiles(dir, baseDir) {
  const base = baseDir || dir;
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listAllFiles(fullPath, base)));
    } else {
      results.push({ absPath: fullPath, relPath: path.relative(base, fullPath) });
    }
  }

  return results;
}

function isBinary(ext) {
  return BINARY_EXTS.has(ext.toLowerCase());
}

function isImage(ext) {
  return IMAGE_EXTS.has(ext.toLowerCase());
}

async function checkHandlebarsRemnants(outDir) {
  const remnants = [];
  const files = await listAllFiles(outDir);

  for (const { absPath, relPath } of files) {
    const ext = path.extname(relPath).toLowerCase();
    if (isBinary(ext)) continue;

    try {
      const content = await fs.readFile(absPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('{{') || lines[i].includes('}}')) {
          remnants.push({ file: relPath, line: i + 1 });
        }
      }
    } catch (err) {
      remnants.push({ file: relPath, error: err.message });
    }
  }

  return remnants;
}

async function checkEmptyFiles(outDir) {
  const emptyFiles = [];
  const files = await listAllFiles(outDir);

  for (const { absPath, relPath } of files) {
    const ext = path.extname(relPath).toLowerCase();
      if (isImage(ext)) continue;

      const basename = path.basename(relPath);
      if (basename === '__init__.py') continue;

    try {
      const stat = await fs.stat(absPath);
      if (stat.size === 0) {
        emptyFiles.push({ file: relPath, reason: 'empty file' });
        continue;
      }

      if (isBinary(ext)) continue;

      const content = await fs.readFile(absPath, 'utf8');
      if (content.trim().length === 0) {
        emptyFiles.push({ file: relPath, reason: 'whitespace-only' });
      }
    } catch (err) {
      emptyFiles.push({ file: relPath, error: err.message });
    }
  }

  return emptyFiles;
}

async function resolveTypeScriptImport(importPath, fromFile, outDir) {
  const fromDir = path.dirname(fromFile);
  const resolved = path.resolve(fromDir, importPath);
  const relToOut = path.relative(outDir, resolved);

  if (relToOut.startsWith('..')) return false;

  const candidates = [
    resolved,
    resolved + '.ts',
    resolved + '.tsx',
    resolved + '.js',
    resolved + '.jsx',
    resolved + '.mjs',
    resolved + '.cjs',
    path.join(resolved, 'index.ts'),
    path.join(resolved, 'index.tsx'),
    path.join(resolved, 'index.js'),
    path.join(resolved, 'index.jsx'),
    path.join(resolved, 'index.mjs'),
    path.join(resolved, 'index.cjs'),
  ];

  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return true;
    }
  }

  return false;
}

async function validateNodeImports(outDir) {
  const broken = [];
  const sourceExts = SOURCE_EXTS_BY_LANG.node;
  const files = await listAllFiles(outDir);

  for (const { absPath, relPath } of files) {
    const ext = path.extname(relPath).toLowerCase();
    if (!sourceExts.includes(ext)) continue;

    try {
      const content = await fs.readFile(absPath, 'utf8');
      const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const exists = await resolveTypeScriptImport(importPath, absPath, outDir);
        if (!exists) {
          broken.push({
            file: relPath,
            line: content.substring(0, match.index).split('\n').length,
            import: importPath,
          });
        }
      }
    } catch (err) {
      broken.push({ file: relPath, error: err.message });
    }
  }

  return broken;
}

async function validatePythonImports(outDir) {
  const broken = [];
  const sourceExts = SOURCE_EXTS_BY_LANG.python;
  const files = await listAllFiles(outDir);

  for (const { absPath, relPath } of files) {
    const ext = path.extname(relPath).toLowerCase();
    if (!sourceExts.includes(ext)) continue;

    try {
      const content = await fs.readFile(absPath, 'utf8');
      const importRegex = /from\s+([a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*)*)\s+import\b/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const modulePath = match[1];
        const moduleParts = modulePath.split('.');
        const filePath = path.join(outDir, ...moduleParts);

        const candidates = [
          filePath + '.py',
          path.join(filePath, '__init__.py'),
        ];

        let found = false;
        for (const candidate of candidates) {
          if (await fs.pathExists(candidate)) {
            found = true;
            break;
          }
        }

        if (!found) {
          broken.push({
            file: relPath,
            line: content.substring(0, match.index).split('\n').length,
            import: `from ${modulePath} import ...`,
          });
        }
      }
    } catch (err) {
      broken.push({ file: relPath, error: err.message });
    }
  }

  return broken;
}

const GO_IMPORT_REGEX = /"(github\.com\/[a-zA-Z0-9][-a-zA-Z0-9_.]*(\/[a-zA-Z0-9][-a-zA-Z0-9_.]*)*(\/[a-zA-Z0-9][-a-zA-Z0-9_.]*)?)"/g;

async function validateGoImports(outDir) {
  const invalid = [];
  const sourceExts = SOURCE_EXTS_BY_LANG.go;
  const files = await listAllFiles(outDir);

  for (const { absPath, relPath } of files) {
    const ext = path.extname(relPath).toLowerCase();
    if (!sourceExts.includes(ext)) continue;

    try {
      const content = await fs.readFile(absPath, 'utf8');
      let match;

      while ((match = GO_IMPORT_REGEX.exec(content)) !== null) {
        const importPath = match[1];
        const parts = importPath.split('/');

        const invalidPart = parts.find((p) => {
          if (p.length === 0) return true;
          if (p.startsWith('.') || p.startsWith('-') || p.endsWith('-') || p.endsWith('.')) return true;
          if (!/^[a-zA-Z0-9][-a-zA-Z0-9_.]*$/.test(p)) return true;
          return false;
        });

        if (invalidPart) {
          invalid.push({
            file: relPath,
            line: content.substring(0, match.index).split('\n').length,
            import: importPath,
            reason: `invalid path segment: "${invalidPart}"`,
          });
        }
      }
    } catch (err) {
      invalid.push({ file: relPath, error: err.message });
    }
  }

  return invalid;
}

async function validateOutput(outDir, ctx) {
  const results = {};

  const remnants = await checkHandlebarsRemnants(outDir);
  results.handlebarsRemnants = remnants;

  const emptyFiles = await checkEmptyFiles(outDir);
  results.emptyFiles = emptyFiles;

  const language = (ctx && ctx.language) || null;

  if (language === 'node') {
    const imports = await validateNodeImports(outDir);
    results.brokenImports = imports;
  } else if (language === 'python') {
    const imports = await validatePythonImports(outDir);
    results.brokenImports = imports;
  } else if (language === 'go') {
    const imports = await validateGoImports(outDir);
    results.invalidImports = imports;
  }

  return results;
}

async function validateTypeScript(outDir) {
  const tsconfigPath = path.join(outDir, 'tsconfig.json');
  const hasTsconfig = await fs.pathExists(tsconfigPath);

  if (!hasTsconfig) {
    return { passed: true, skipped: true, reason: 'no tsconfig.json found', errors: [] };
  }

  const nodeModulesPath = path.join(outDir, 'node_modules');
  if (!(await fs.pathExists(nodeModulesPath))) {
    return { passed: true, skipped: true, reason: 'node_modules not installed (--skip-install)', errors: [] };
  }

  try {
    execSync('npx tsc --noEmit --strict', {
      cwd: outDir,
      timeout: 60000,
      stdio: 'pipe',
    });
    return { passed: true, errors: [] };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    const stdout = err.stdout ? err.stdout.toString() : '';
    const combined = (stdout + '\n' + stderr).trim();
    const errorLines = combined.split('\n').filter((l) => l.trim().length > 0);
    return { passed: false, errors: errorLines };
  }
}

async function validatePython(outDir) {
  const files = await listAllFiles(outDir);
  const pyFiles = files.filter((f) => path.extname(f.relPath).toLowerCase() === '.py');
  const errors = [];

  if (pyFiles.length === 0) {
    return { passed: true, totalFiles: 0, errors: [] };
  }

  const tmpFile = path.join(outDir, '.pasha_compile_check.py');
  await fs.writeFile(tmpFile, `
import sys
for p in sys.argv[1:]:
    try:
        with open(p, 'r') as f:
            compile(f.read(), p, 'exec')
    except SyntaxError as e:
        print(f"{p}: {e}", file=sys.stderr)
        sys.exit(1)
`.trim() + '\n', 'utf8');

  try {
    const pyPaths = pyFiles.map((f) => f.absPath);
    execSync(`python3 "${tmpFile}" ${pyPaths.map((p) => `"${p}"`).join(' ')}`, {
      cwd: outDir,
      timeout: 30000,
      stdio: 'pipe',
    });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    const stdout = err.stdout ? err.stdout.toString() : '';
    const combined = (stdout + '\n' + stderr).trim();
    const lines = combined.split('\n').filter((l) => l.trim().length > 0);
    for (const line of lines) {
      const match = line.match(/^(.+\.py):\s*(.+)/);
      if (match) {
        const filePath = match[1];
        const pyFile = pyFiles.find((f) => f.absPath.endsWith(filePath) || f.absPath === filePath);
        errors.push({
          file: pyFile ? pyFile.relPath : filePath,
          error: match[2],
        });
      } else {
        errors.push({ file: '<unknown>', error: line });
      }
    }
  } finally {
    await fs.remove(tmpFile).catch(() => {});
  }

  return {
    passed: errors.length === 0,
    totalFiles: pyFiles.length,
    errors,
  };
}

async function validateGo(outDir) {
  const files = await listAllFiles(outDir);
  const goFiles = files.filter((f) => path.extname(f.relPath).toLowerCase() === '.go');
  const hasGoMod = files.some((f) => f.relPath === 'go.mod' || path.basename(f.relPath) === 'go.mod');

  return {
    goFileCount: goFiles.length,
    hasGoMod,
    passed: goFiles.length > 0,
  };
}

async function validateManifest(manifestPath) {
  const dir = path.dirname(manifestPath);
  const dead = [];

  try {
    const manifest = await fs.readJson(manifestPath);
    const templateDirs = new Set();

    function collectTemplates(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (key === 'template' && typeof val === 'string') {
          templateDirs.add(val);
        } else if (typeof val === 'object' && val !== null) {
          collectTemplates(val);
        }
      }
    }

    collectTemplates(manifest);

    for (const templateDir of templateDirs) {
      const templatePath = path.join(dir, templateDir);
      if (!(await fs.pathExists(templatePath))) {
        dead.push({ template: templateDir, path: templatePath, reason: 'directory not found' });
      } else {
        const stat = await fs.stat(templatePath);
        if (!stat.isDirectory()) {
          dead.push({ template: templateDir, path: templatePath, reason: 'not a directory' });
        }
      }
    }

    return { manifestPath, deadOptions: dead, allValid: dead.length === 0 };
  } catch (err) {
    return { manifestPath, error: err.message, deadOptions: [], allValid: false };
  }
}

async function validateAll(outDir, ctx) {
  const report = {
    outDir,
    language: (ctx && ctx.language) || 'unknown',
    checks: {},
    summary: { passed: 0, failed: 0, warnings: 0, total: 0 },
  };

  const templateCheck = await validateOutput(outDir, ctx);

  const hbPassed = templateCheck.handlebarsRemnants.length === 0;
  report.checks.handlebarsRemnants = {
    passed: hbPassed,
    details: templateCheck.handlebarsRemnants,
  };
  if (!hbPassed) report.summary.failed++;
  report.summary.total++;

  const emptyPassed = templateCheck.emptyFiles.length === 0;
  report.checks.emptyFiles = {
    passed: emptyPassed,
    details: templateCheck.emptyFiles,
  };
  if (!emptyPassed) report.summary.failed++;
  report.summary.total++;

  if (templateCheck.brokenImports) {
    const importsPassed = templateCheck.brokenImports.length === 0;
    report.checks.brokenImports = {
      passed: importsPassed,
      details: templateCheck.brokenImports,
    };
    if (!importsPassed) report.summary.failed++;
    report.summary.total++;
  }

  if (templateCheck.invalidImports) {
    const importsPassed = templateCheck.invalidImports.length === 0;
    report.checks.invalidImports = {
      passed: importsPassed,
      details: templateCheck.invalidImports,
    };
    if (!importsPassed) report.summary.failed++;
    report.summary.total++;
  }

  const language = (ctx && ctx.language) || null;

  if (language === 'node') {
    const tsCheck = await validateTypeScript(outDir);
    report.checks.typecheck = tsCheck;
    if (!tsCheck.passed) report.summary.failed++;
    if (!tsCheck.skipped) report.summary.total++;
  }

  if (language === 'python') {
    const pyCheck = await validatePython(outDir);
    report.checks.pythonSyntax = pyCheck;
    if (!pyCheck.passed) report.summary.failed++;
    report.summary.total++;
  }

  if (language === 'go') {
    const goCheck = await validateGo(outDir);
    report.checks.goValidation = goCheck;
    if (!goCheck.passed) report.summary.failed++;
    report.summary.total++;
  }

  report.summary.passed = report.summary.total - report.summary.failed;

  return report;
}

module.exports = {
  validateOutput,
  validateTypeScript,
  validatePython,
  validateGo,
  validateManifest,
  validateAll,
};
