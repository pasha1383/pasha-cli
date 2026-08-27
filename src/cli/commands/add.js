'use strict';
const path = require('path');
const fs = require('fs-extra');
const log = require('../../utils/logger');
const { loadManifest, getTemplateDir } = require('../../core/catalog/manifest');
const { resolveFeatures } = require('../../core/features/index');
const { renderModuleFiles } = require('../../core/engine/renderer');
const { makeIncludeCheck } = require('../../core/engine/conditions');
const { prompt } = require('../../ui/prompts');

// Same pattern used by the interactive module-name prompt below and by
// stepProject/askModules in create.js — kept identical everywhere a module
// name is accepted.
const MODULE_NAME_RE = /^[a-z][a-z0-9-]*$/;

async function add(opts) {
  const cwd = process.cwd();
  const pashaJsonPath = path.join(cwd, '.pasha.json');

  if (!await fs.pathExists(pashaJsonPath)) {
    log.fail('No .pasha.json found. Run "pasha create" first to scaffold a project, then use "pasha add module <name>".');
    process.exit(1);
  }

  const pashaConfig = await fs.readJson(pashaJsonPath);
  const templateName = pashaConfig.template;
  const ctx = pashaConfig.context;
  const stackFlavor = pashaConfig.stackFeatures;

  const manifest = await loadManifest();
  const templateDir = path.join(manifest._templateRoot || path.join(__dirname, '../../../templates'), templateName);
  const tc = await fs.readJson(path.join(templateDir, 'template.json'));

  if (!tc.modules || !tc.modules.enabled) {
    log.fail('This project template does not support adding modules.');
    process.exit(1);
  }

  const fm = stackFlavor ? resolveFeatures(stackFlavor) : null;

  let moduleName = opts.args[0];
  if (!moduleName) {
    const { name } = await prompt([{
      type: 'input', name: 'name',
      message: 'Module name?',
      validate: (v) => MODULE_NAME_RE.test(v) || 'Lowercase letters, numbers, and hyphens only',
    }]);
    moduleName = name;
  } else if (!MODULE_NAME_RE.test(moduleName)) {
    // A module name passed as a CLI positional argument must be validated
    // here too — it otherwise bypasses the prompt's `validate` entirely and
    // flows straight into path.join() when rendering module files.
    log.fail(`Invalid module name "${moduleName}". Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.`);
    process.exit(1);
  }

  const existingModules = ctx.modules || [];
  if (existingModules.includes(moduleName)) {
    log.fail(`Module "${moduleName}" already exists in this project.`);
    process.exit(1);
  }

  const flags = stackFlavor ? fm.deriveFlags(ctx) : {};
  const renderCtx = Object.assign({}, ctx, flags, { moduleName });

  const moduleFilesDir = path.join(templateDir, 'moduleFiles');
  if (!await fs.pathExists(moduleFilesDir)) {
    log.fail('No moduleFiles directory in this template.');
    process.exit(1);
  }

  const shouldInclude = makeIncludeCheck(tc.fileConditions || {}, renderCtx);
  await renderModuleFiles(moduleFilesDir, cwd, renderCtx, [moduleName], shouldInclude);

  existingModules.push(moduleName);
  pashaConfig.context.modules = existingModules;
  await fs.writeJson(pashaJsonPath, pashaConfig, { spaces: 2 });

  log.ok(`Module "${moduleName}" added to project.`);
  console.log(`  Files generated in src/ (check your project structure for the exact path).`);
}

module.exports = { add };
