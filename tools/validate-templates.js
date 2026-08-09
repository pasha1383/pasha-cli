#!/usr/bin/env node
'use strict';

/**
 * Static validator for the template tree. Runs with zero dependencies so it
 * works in CI before `npm install`.
 *
 * What it checks:
 *   1. manifest.json points at template directories that actually exist
 *   2. every template.json parses and has the keys the engine reads
 *   3. every fileConditions key matches at least one real path (catches dead conditions)
 *   4. Handlebars blocks are balanced and no `}}}` brace collisions exist
 *   5. every flag referenced in a template or in fileConditions is actually
 *      produced by the matching features module
 *   6. literal boolean condition values (P0-2 regression guard)
 *   7. pairs of {{#if X}}/{{#unless X}} blocks that both render for same answers (P0-3)
 *
 * Exit code is non-zero when any ERROR is found, so CI can gate on it.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATES = path.join(ROOT, 'templates');

const errors = [];
const warnings = [];

function err(scope, msg) {
  errors.push(`${scope}: ${msg}`);
}
function warn(scope, msg) {
  warnings.push(`${scope}: ${msg}`);
}

// ---------------------------------------------------------------- utilities

function walk(dir, base = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + entry.name : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push({ rel, abs, dir: true });
      out.push(...walk(abs, rel));
    } else {
      out.push({ rel, abs, dir: false });
    }
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ------------------------------------------------------- handlebars scanning

const BLOCK_HELPERS = new Set(['if', 'unless', 'each', 'with', 'eq']);
const INLINE_HELPERS = new Set([
  'pascalCase',
  'camelCase',
  'constantCase',
  'snakeCase',
  'kebabCase',
  'shellDefault',
  'json',
  'lookup',
  'log',
]);

const MUSTACHE = /(?<!\\)\{\{\{?[^{}]*\}?\}\}/g;

function scanMustaches(src) {
  const tags = [];
  let m;
  MUSTACHE.lastIndex = 0;
  while ((m = MUSTACHE.exec(src))) {
    const raw = m[0];
    const inner = raw.replace(/^\{\{\{?/, '').replace(/\}?\}\}$/, '').trim();
    tags.push({ raw, inner, index: m.index });
  }
  return tags;
}

function checkBraceCollisions(relPath, src, scope) {
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (/\$\{[^}]*\{\{/.test(line)) {
      err(scope, `${relPath}:${i + 1} shell \${...} wraps a mustache — use the shellDefault helper instead`);
    }
  });
}

function checkBlockBalance(relPath, tags, scope) {
  const stack = [];
  for (const tag of tags) {
    const inner = tag.inner;
    if (!inner || inner.startsWith('!')) continue;
    if (inner.startsWith('#')) {
      const name = inner.slice(1).trim().split(/\s+/)[0];
      stack.push({ name, tag });
    } else if (inner.startsWith('/')) {
      const name = inner.slice(1).trim();
      const open = stack.pop();
      if (!open) {
        err(scope, `${relPath} has a closing {{/${name}}} with no matching open`);
      } else if (open.name !== name) {
        err(scope, `${relPath} closes {{/${name}}} but the open block was {{#${open.name}}}`);
      }
    }
  }
  for (const open of stack) {
    err(scope, `${relPath} never closes {{#${open.name}}}`);
  }
}

// --- P0-3 guard: find if/X and unless/X pairs that both render ---
function checkDuplicateIfUnless(relPath, tags, scope) {
  const ifFlags = new Set();
  const unlessFlags = new Set();
  for (const tag of tags) {
    let inner = tag.inner;
    if (!inner || inner.startsWith('!') || inner.startsWith('/')) continue;
    if (inner === 'else') continue;
    inner = inner.replace(/^[#^]/, '').trim();
    if (inner.startsWith('else ')) inner = inner.slice(5).trim();

    const name = inner.split(/\s+/)[0];
    if (!name) continue;

    if (tag.inner.startsWith('#') && tag.inner.slice(1).trim().split(/\s+/)[0] === 'if') {
      ifFlags.add(name);
    }
    if (tag.inner.startsWith('#') && tag.inner.slice(1).trim().split(/\s+/)[0] === 'unless') {
      unlessFlags.add(name);
    }

    // Check for `{{#if X}}` and `{{#unless X}}` with the same X
    for (const f of ifFlags) {
      if (unlessFlags.has(f)) {
        warn(scope, `${relPath} has both {{#if ${f}}} and {{#unless ${f}}} — they may both render`);
      }
    }
  }
}

function collectIdentifiers(tags, into) {
  for (const tag of tags) {
    let inner = tag.inner;
    if (!inner || inner.startsWith('!') || inner.startsWith('/')) continue;
    if (inner === 'else') continue;
    inner = inner.replace(/^[#^]/, '').trim();
    if (inner.startsWith('else ')) inner = inner.slice(5).trim();

    const withoutStrings = inner.replace(/"[^"]*"|'[^']*'/g, ' ');
    const parts = withoutStrings.split(/[\s()]+/).filter(Boolean);
    if (!parts.length) continue;

    const head = parts[0];
    const isHelperCall =
      INLINE_HELPERS.has(head) || BLOCK_HELPERS.has(head) || parts.length > 1;

    const operands = isHelperCall && (INLINE_HELPERS.has(head) || BLOCK_HELPERS.has(head))
      ? parts.slice(1)
      : parts;

    for (const token of operands) {
      if (!token) continue;
      if (/^[-\d]/.test(token)) continue;
      if (token === 'true' || token === 'false' || token === 'null' || token === 'this') continue;
      if (token.startsWith('@')) continue;
      if (INLINE_HELPERS.has(token) || BLOCK_HELPERS.has(token)) continue;
      const base = token.split('.')[0].replace(/^\.+/, '');
      if (!base || !/^[A-Za-z_]\w*$/.test(base)) continue;
      into.add(base);
    }
  }
}

// -------------------------------------------------- known context keys

const BASE_CONTEXT_KEYS = new Set([
  'projectName',
  'author',
  'github',
  'description',
  'language',
  'framework',
  'architecture',
  'architectureLabel',
  'modules',
  'moduleName',
  'dbName',
  'dependenciesJson',
  'devDependenciesJson',
  'scriptsJson',
  'jestConfigJson',
  'requirementsTxt',
  'devRequirementsTxt',
  'goModules',
  'makeTargets',
  'extras',
  'year',
  'pashaVersion',
  'module',
  'version',
  'name',
  'cmd',
  'deps',
  'phony',
]);

function flagsFor(flavor) {
  const modPath =
    flavor === 'nestjs' || !flavor
      ? '../lib/core/features.js'
      : `../lib/core/features-${flavor}.js`;
  let mod;
  try {
    mod = require(path.join(__dirname, modPath));
  } catch (e) {
    return null;
  }
  if (typeof mod.deriveFlags !== 'function') return null;

  const keys = new Set();
  const orms = (mod.ormChoices ? mod.ormChoices() : []).map((c) => c.value);
  const validations = (mod.validationChoices ? mod.validationChoices() : []).map((c) => c.value);
  const extras = (mod.extraFeatureChoices ? mod.extraFeatureChoices() : []).map((c) => c.value);

  for (const orm of orms.length ? orms : ['none']) {
    for (const validation of validations.length ? validations : ['none']) {
      for (const broker of ['none', 'kafka', 'rabbitmq']) {
        const dbs = mod.databaseChoices ? mod.databaseChoices(orm).map((c) => c.value) : [];
        for (const database of dbs.length ? dbs : ['none']) {
          const flags = mod.deriveFlags({
            orm,
            database,
            validation,
            broker,
            useRedis: true,
            useAgentDocs: true,
            extras,
          });
          Object.keys(flags).forEach((k) => keys.add(k));
        }
      }
    }
  }
  return keys;
}

// ------------------------------------------------------------------- checks

function templatePaths(templateDir, sharedDir) {
  const paths = new Set();
  for (const dir of [templateDir, sharedDir].filter(Boolean)) {
    for (const sub of ['files', 'moduleFiles']) {
      for (const entry of walk(path.join(dir, sub))) {
        paths.add(entry.rel);
      }
    }
  }
  return paths;
}

function checkTemplate(name, tmplJsonPath) {
  const scope = name;
  let tc;
  try {
    tc = readJson(tmplJsonPath);
  } catch (e) {
    err(scope, `template.json is not valid JSON — ${e.message}`);
    return;
  }

  for (const key of ['name', 'prerequisites', 'fileConditions']) {
    if (!(key in tc)) err(scope, `template.json is missing "${key}"`);
  }

  const templateDir = path.join(TEMPLATES, name);
  const sharedDir = tc.shared ? path.join(TEMPLATES, tc.shared) : null;
  if (sharedDir && !fs.existsSync(sharedDir)) {
    err(scope, `"shared": "${tc.shared}" points at a directory that does not exist`);
  }

  const paths = templatePaths(templateDir, sharedDir);

  // -- 3. every fileConditions key must match a real path -------------------
  for (const [prefix, flag] of Object.entries(tc.fileConditions || {})) {
    // P0-2 guard: boolean literals in fileConditions
    if (typeof flag === 'boolean') {
      err(scope, `fileConditions key "${prefix}" has a boolean value (${flag}) — use a string flag name or remove the entry for always-included files`);
      continue;
    }
    if (typeof flag !== 'string') {
      err(scope, `fileConditions key "${prefix}" has a ${typeof flag} value — must be a string flag name`);
      continue;
    }
    const normalized = prefix.replace(/\/+$/, '');
    const hit = [...paths].some(
      (p) => p === normalized || p.startsWith(normalized + '/')
    );
    if (!hit) {
      warn(scope, `fileConditions key "${prefix}" matches no file in this template (dead condition)`);
    }
  }

  // -- 4 + 5. scan every .hbs file -----------------------------------------
  const identifiers = new Set();
  for (const dir of [templateDir, sharedDir].filter(Boolean)) {
    for (const sub of ['files', 'moduleFiles']) {
      for (const entry of walk(path.join(dir, sub))) {
        if (entry.dir) {
          collectIdentifiers(scanMustaches(entry.rel), identifiers);
          continue;
        }
        collectIdentifiers(scanMustaches(path.basename(entry.rel)), identifiers);
        if (!entry.rel.endsWith('.hbs')) continue;
        const src = fs.readFileSync(entry.abs, 'utf8');
        const tags = scanMustaches(src);
        checkBraceCollisions(entry.rel, src, scope);
        checkBlockBalance(entry.rel, tags, scope);
        checkDuplicateIfUnless(entry.rel, tags, scope);
        collectIdentifiers(tags, identifiers);
      }
    }
  }

  const known = flagsFor(tc.stackFeatures);
  if (!known) {
    warn(scope, `no features module for stackFeatures "${tc.stackFeatures}" — flag names unchecked`);
    return;
  }

  const allKnown = new Set([...known, ...BASE_CONTEXT_KEYS]);

  for (const id of [...identifiers].sort()) {
    if (!allKnown.has(id)) {
      err(scope, `template references "{{${id}}}" which no features module produces`);
    }
  }
  for (const flag of Object.values(tc.fileConditions || {})) {
    if (typeof flag !== 'string') continue;
    if (!allKnown.has(flag)) {
      err(scope, `fileConditions uses flag "${flag}" which no features module produces`);
    }
  }
}

// --------------------------------------------------------------------- main

function main() {
  const manifestPath = path.join(TEMPLATES, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    err('manifest', 'templates/manifest.json not found');
    for (const e of errors) console.log('ERROR ' + e);
    process.exit(1);
  }
  const manifest = readJson(manifestPath);

  const referenced = new Set();
  for (const [langKey, lang] of Object.entries(manifest.languages || {})) {
    if (!lang.frameworks) err('manifest', `language "${langKey}" has no frameworks`);
    for (const [fwKey, fw] of Object.entries(lang.frameworks || {})) {
      if (!fw.architectures) err('manifest', `${langKey}/${fwKey} has no architectures`);
      for (const [archKey, arch] of Object.entries(fw.architectures || {})) {
        const label = `${langKey}/${fwKey}/${archKey}`;
        if (!arch.template) {
          err('manifest', `${label} has no "template"`);
          continue;
        }
        referenced.add(arch.template);
        const dir = path.join(TEMPLATES, arch.template);
        if (!fs.existsSync(path.join(dir, 'template.json'))) {
          err('manifest', `${label} points at "${arch.template}" which has no template.json`);
        }
      }
    }
  }

  for (const entry of fs.readdirSync(TEMPLATES, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const tmplJson = path.join(TEMPLATES, entry.name, 'template.json');
    if (!fs.existsSync(tmplJson)) continue;
    if (!referenced.has(entry.name)) {
      warn('manifest', `template "${entry.name}" exists but is not reachable from manifest.json`);
    }
    checkTemplate(entry.name, tmplJson);
  }

  for (const w of warnings) console.log('WARN  ' + w);
  for (const e of errors) console.log('ERROR ' + e);
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}

main();
