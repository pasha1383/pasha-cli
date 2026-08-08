'use strict';
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');

const log = require('../utils/logger');
const { run } = require('../utils/exec');
const { loadManifest, getLanguages, getFrameworks, getArchitectures, getTemplateDir } = require('../core/manifest');
const { renderTemplateDir, renderModuleFiles, makeIncludeCheck } = require('../core/engine');
const { checkAll, installTool, resolveCommandPath } = require('../core/prerequisites');
const features = require('../core/features');
const featuresExpress = require('../core/features-express');
const featuresFastify = require('../core/features-fastify');
const featuresPython = require('../core/features-python');
const tui = require('../core/tui');
const history = require('../core/history');

const TEMPLATES_ROOT = path.join(__dirname, '../../templates');
const TOTAL_STEPS = 6;

let currentStep = 0;

function nextStep(title) {
  currentStep++;
  tui.step(currentStep, TOTAL_STEPS, title);
}

async function ensurePrerequisites(tools) {
  if (!tools || !tools.length) return;
  const results = checkAll(tools);
  const missing = results.filter((r) => !r.installed);

  if (!missing.length) {
    log.ok('All prerequisites are ready');
    return;
  }

  missing.forEach((m) => log.fail(`${m.tool} is not installed`));
  const { shouldInstall } = await inquirer.prompt([{
    type: 'confirm',
    name: 'shouldInstall',
    message: `Install ${missing.map((m) => m.tool).join(', ')} now?`,
    default: true,
  }]);

  if (!shouldInstall) {
    log.warn('Without these prerequisites, the generated project may not run.');
    return;
  }

  for (const m of missing) {
    try {
      await installTool(m.tool);
      log.ok(`${m.tool} installed`);
    } catch (err) {
      log.fail(err.message);
    }
  }
}

async function askCoreStack(featuresModule) {
  tui.section('🧰 Stack Configuration');

  const { orm } = await inquirer.prompt([{
    type: 'list',
    name: 'orm',
    message: 'Data layer / ORM?',
    choices: featuresModule.ormChoices(),
  }]);

  let database = 'none';
  if (orm !== 'none') {
    const choices = featuresModule.databaseChoices(orm);
    if (choices.length === 1) {
      database = choices[0].value;
      log.info(`   Database: ${choices[0].name} (the only option ${orm} supports)`);
    } else {
      const answer = await inquirer.prompt([{
        type: 'list',
        name: 'database',
        message: 'Database?',
        choices,
      }]);
      database = answer.database;
    }
  }

  const { validation } = await inquirer.prompt([{
    type: 'list',
    name: 'validation',
    message: 'Validation & transformation?',
    choices: featuresModule.validationChoices(),
  }]);

  const { useRedis } = await inquirer.prompt([{
    type: 'confirm',
    name: 'useRedis',
    message: 'Add Redis for caching?',
    default: false,
  }]);

  const { broker } = await inquirer.prompt([{
    type: 'list',
    name: 'broker',
    message: 'Message broker?',
    choices: featuresModule.brokerChoices(),
  }]);

  const { useAgentDocs } = await inquirer.prompt([{
    type: 'confirm',
    name: 'useAgentDocs',
    message: 'Generate AGENT.md files for AI-assisted development?',
    default: true,
  }]);

  return { orm, database, validation, useRedis, broker, useAgentDocs };
}

async function askStackFeaturesNest() {
  const core = await askCoreStack(features);

  const { extras } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'extras',
    message: 'Additional features (space to toggle)?',
    choices: features.extraFeatureChoices(),
  }]);

  return Object.assign({}, core, { extras });
}

async function askStackFeaturesExpress() {
  const core = await askCoreStack(featuresExpress);

  const { extras } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'extras',
    message: 'Additional features (space to toggle)?',
    choices: featuresExpress.extraFeatureChoices(),
  }]);

  return Object.assign({}, core, { extras });
}

async function askStackFeaturesFastify() {
  const core = await askCoreStack(featuresFastify);

  const { extras } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'extras',
    message: 'Additional features (space to toggle)?',
    choices: featuresFastify.extraFeatureChoices(),
  }]);

  return Object.assign({}, core, { extras });
}

async function askStackFeaturesGo() {
  const core = await askCoreStack(featuresGo);

  const { extras } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'extras',
    message: 'Additional features (space to toggle)?',
    choices: featuresGo.extraFeatureChoices(),
  }]);

  return Object.assign({}, core, { extras });
}

async function askStackFeaturesPython() {
  const core = await askCoreStack(featuresPython);

  const { extras } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'extras',
    message: 'Additional features (space to toggle)?',
    choices: featuresPython.extraFeatureChoices(),
  }]);

  return Object.assign({}, core, { extras });
}

async function askModules(templateConfig) {
  if (!templateConfig.modules || !templateConfig.modules.enabled) return [];

  tui.section('🧱 Modules');

  const { moduleCount } = await inquirer.prompt([{
    type: 'input',
    name: 'moduleCount',
    message: 'How many modules/entities do you want to scaffold?',
    default: '1',
    validate: (v) => {
      const n = Number(v);
      return (Number.isInteger(n) && n >= 1 && n <= 20) || 'Enter a whole number between 1 and 20';
    },
  }]);

  const count = Number(moduleCount);
  const modules = [];
  for (let i = 0; i < count; i++) {
    const { moduleName } = await inquirer.prompt([{
      type: 'input',
      name: 'moduleName',
      message: `${templateConfig.modules.message} [${i + 1}/${count}]`,
      default: i === 0 ? templateConfig.modules.default : undefined,
      validate: (v) => {
        if (!/^[a-z][a-z0-9-]*$/.test(v)) {
          return 'Start with a lowercase letter; use lowercase letters, numbers, and hyphens only';
        }
        if (modules.includes(v)) return `"${v}" was already added — pick a different name`;
        return true;
      },
    }]);
    modules.push(moduleName);
  }
  return modules;
}

async function resumeSession() {
  const sessions = await history.listSessions(10);
  if (!sessions.length) {
    log.info('No previous sessions found. Starting fresh.');
    return null;
  }

  console.log('');
  const { sessionIndex } = await inquirer.prompt([{
    type: 'list',
    name: 'sessionIndex',
    message: 'Resume a previous session:',
    choices: [
      { name: 'Start a new session', value: -1 },
      ...sessions.map((s, i) => ({
        name: `${s.projectName} · ${s.framework || '?'} · ${s.architecture || '?'} · ${chalk.dim(s.timestamp.slice(0, 10))}`,
        value: i,
      })),
    ],
  }]);

  if (sessionIndex === -1) return null;

  const session = await fs.readJson(sessions[sessionIndex].path);
  log.ok(`Loaded session: ${session.projectName}`);
  return session;
}

function buildContext(manifest, baseAnswers, stackFlavor, featuresModule, stackAnswers, flags, modules, architectureLabel, language, framework, architecture, templateConfig) {
  const ctx = Object.assign({}, baseAnswers, flags, {
    modules,
    architectureLabel,
    language,
    framework,
    architecture,
    dbName: String(baseAnswers.projectName).replace(/-/g, '_').toLowerCase(),
  });

  if (stackFlavor) {
    if (stackFlavor === 'go') {
      const deps = featuresModule.resolveDependencies(flags);
      ctx.goModules = deps.goModules;
    } else if (stackFlavor === 'python') {
      const deps = featuresModule.resolveDependencies(flags);
      ctx.requirementsTxt = deps.requirements.join('\n') + '\n';
      if (deps.devRequirements && deps.devRequirements.length > 0) {
        ctx.devRequirementsTxt = deps.devRequirements.join('\n') + '\n';
      }
    } else {
      const deps = featuresModule.resolveDependencies(flags);
      ctx.dependenciesJson = JSON.stringify(deps.dependencies, null, 4).replace(/\n/g, '\n  ');
      ctx.devDependenciesJson = JSON.stringify(deps.devDependencies, null, 4).replace(/\n/g, '\n  ');
      ctx.scriptsJson = JSON.stringify(featuresModule.resolveScripts(flags), null, 4).replace(/\n/g, '\n  ');
      if (flags.useTests && featuresModule.resolveJestConfig) {
        ctx.jestConfigJson = JSON.stringify(featuresModule.resolveJestConfig(), null, 4).replace(/\n/g, '\n  ');
      }
    }
  }

  return ctx;
}

async function renderProject(ctx, templateConfig, templateDir) {
  const outDir = path.resolve(process.cwd(), ctx.projectName);
  if (await fs.pathExists(outDir)) {
    log.fail(`Directory "${ctx.projectName}" already exists.`);
    process.exit(1);
  }

  const shouldInclude = makeIncludeCheck(templateConfig.fileConditions, ctx);
  const modules = ctx.modules || [];

  const spinner = ora('Generating files...').start();
  try {
    await fs.ensureDir(outDir);

    if (templateConfig.shared) {
      const sharedFiles = path.join(TEMPLATES_ROOT, templateConfig.shared, 'files');
      if (await fs.pathExists(sharedFiles)) {
        await renderTemplateDir(sharedFiles, outDir, ctx, shouldInclude);
      }
    }

    await renderTemplateDir(path.join(templateDir, 'files'), outDir, ctx, shouldInclude);

    const moduleFilesDir = path.join(templateDir, 'moduleFiles');
    if (modules.length && (await fs.pathExists(moduleFilesDir))) {
      await renderModuleFiles(moduleFilesDir, outDir, ctx, modules, shouldInclude);
    }

    spinner.succeed(chalk.green(`Files generated (${modules.length} module${modules.length === 1 ? '' : 's'})`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }

  if (templateConfig.postInstall && templateConfig.postInstall.includes('npm install')) {
    tui.section('📦 Installing dependencies');
    const npmPath = resolveCommandPath('npm');
    if (!npmPath) {
      log.fail('Could not resolve an absolute path for "npm" on PATH.');
      log.warn(`Run it yourself: cd ${ctx.projectName} && npm install`);
    } else {
      log.info(`Using: ${npmPath} install (cwd: ${outDir})`);
      try {
        await run(npmPath, ['install'], { cwd: outDir, stdio: 'inherit' });
        log.ok('npm install done');
      } catch (err) {
        log.fail(err.message);
        log.warn(`Reproduce manually: cd ${ctx.projectName} && npm install`);
      }
    }
  }

  if (templateConfig.stackFeatures === 'go') {
    tui.section('📦 Go modules');
    log.info('Next step: run "cd ' + ctx.projectName + ' && go mod tidy" to download dependencies.');
  }

  if (templateConfig.stackFeatures === 'python') {
    tui.section('📦 Python dependencies');
    log.info('Next step: create a virtual environment and install dependencies:');
    log.info('  python3 -m venv venv');
    log.info('  source venv/bin/activate');
    log.info('  pip install -r requirements.txt');
    if (ctx.devRequirementsTxt) {
      log.info('  pip install -r dev-requirements.txt');
    }
  }

  if (templateConfig.gitInit) {
    const { doGit } = await inquirer.prompt([
      { type: 'confirm', name: 'doGit', message: 'Run git init and first commit?', default: true },
    ]);
    if (doGit) {
      const sg = ora('Setting up git...').start();
      try {
        await run('git', ['init'], { cwd: outDir, stdio: 'ignore' });
        await run('git', ['add', '.'], { cwd: outDir, stdio: 'ignore' });
        await run('git', ['commit', '-m', 'feat: init ' + ctx.projectName], { cwd: outDir, stdio: 'ignore' });
        sg.succeed(chalk.green('git set up'));
      } catch {
        sg.warn('Run git init manually');
      }
    }
  }

  return outDir;
}

async function create(options = {}) {
  tui.welcome();

  // ---- resume from history ----
  if (options.resume) {
    const session = await resumeSession();
    if (!session) return;
    // TODO: skip ahead to summary, asking the user what to change
    log.info('Session resume will skip to confirmation. This is a work in progress.');
    // For now, fall through to normal flow
  }

  // ---- load manifest ----
  let manifest;
  try {
    manifest = await loadManifest();
  } catch (err) {
    log.fail(`Failed to load template manifest: ${err.message}`);
    log.info('Make sure templates/manifest.json exists and is valid JSON.');
    process.exit(1);
  }

  // ---- Step 1: Language ----
  nextStep('Language');
  const { language } = await inquirer.prompt([
    { type: 'list', name: 'language', message: 'Pick a language:', choices: getLanguages(manifest) },
  ]);

  // ---- Step 2: Framework ----
  nextStep('Framework');
  const { framework } = await inquirer.prompt([
    { type: 'list', name: 'framework', message: 'Pick a framework:', choices: getFrameworks(manifest, language) },
  ]);

  // ---- Step 3: Architecture ----
  nextStep('Architecture');
  const architectureChoices = getArchitectures(manifest, language, framework);
  const { architecture } = await inquirer.prompt([
    { type: 'list', name: 'architecture', message: 'Pick an architecture:', choices: architectureChoices },
  ]);
  const architectureLabel = (architectureChoices.find((c) => c.value === architecture) || {}).name || architecture;

  // ---- Load template config ----
  const templateName = getTemplateDir(manifest, language, framework, architecture);
  const templateDir = path.join(TEMPLATES_ROOT, templateName);
  const templateConfig = await fs.readJson(path.join(templateDir, 'template.json'));

  await ensurePrerequisites(templateConfig.prerequisites);

  // ---- Step 4: Project info ----
  nextStep('Project info');
  tui.section('📝 Project Details');
  const baseAnswers = await inquirer.prompt([
    {
      type: 'input', name: 'projectName', message: 'Project name?',
      validate: (v) => /^[a-z0-9-]+$/.test(v) || 'Lowercase letters, numbers, and hyphens only',
    },
    { type: 'input', name: 'author', message: 'Your full name?', validate: (v) => v.trim().length > 0 },
    { type: 'input', name: 'github', message: 'GitHub username?', validate: (v) => /^[a-zA-Z0-9-]+$/.test(v) },
    { type: 'input', name: 'description', message: 'Short description?', default: 'Built with pasha CLI' },
  ]);

  // ---- Step 5: Stack ----
  nextStep('Stack Configuration');
  const stackFlavor = templateConfig.stackFeatures;
  let featuresModule;
  let askStack;
  if (stackFlavor === 'express') {
    featuresModule = featuresExpress;
    askStack = askStackFeaturesExpress;
  } else if (stackFlavor === 'fastify') {
    featuresModule = featuresFastify;
    askStack = askStackFeaturesFastify;
  } else if (stackFlavor === 'go') {
    featuresModule = featuresGo;
    askStack = askStackFeaturesGo;
  } else if (stackFlavor === 'python') {
    featuresModule = featuresPython;
    askStack = askStackFeaturesPython;
  } else {
    featuresModule = features;
    askStack = askStackFeaturesNest;
  }

  const stackAnswers = stackFlavor ? await askStack() : {};
  const flags = stackFlavor ? featuresModule.deriveFlags(stackAnswers) : {};

  // ---- Step 6: Modules ----
  nextStep('Modules');
  const modules = await askModules(templateConfig);

  // ---- Build context ----
  const ctx = buildContext(
    manifest, baseAnswers, stackFlavor, featuresModule,
    stackAnswers, flags, modules,
    architectureLabel, language, framework, architecture, templateConfig
  );

  // ---- Show summary & confirm ----
  tui.summary(ctx);
  const confirmed = await tui.confirm('Ready to scaffold the project?');
  if (!confirmed) {
    log.warn('Aborted. No files were created.');
    process.exit(0);
  }

  // ---- Render ----
  const outDir = await renderProject(ctx, templateConfig, templateDir);

  // ---- Save session ----
  await history.saveSession(ctx);

  // ---- Done ----
  tui.done(outDir, ctx);
}

module.exports = { create };
