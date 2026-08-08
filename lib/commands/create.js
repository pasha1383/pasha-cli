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
const { Navigator } = require('../core/navigator');
const features = require('../core/features');
const featuresExpress = require('../core/features-express');
const featuresFastify = require('../core/features-fastify');
const featuresPython = require('../core/features-python');
const featuresGo = require('../core/features-go');
const tui = require('../core/tui');
const history = require('../core/history');

const TEMPLATES_ROOT = path.join(__dirname, '../../templates');

let _manifest = null;

function backChoice() {
  return { name: chalk.dim('← Go back'), value: '__back__' };
}

function withBack(choices) {
  return [backChoice(), ...choices];
}

function resolveFeatures(stackFlavor) {
  switch (stackFlavor) {
    case 'express': return featuresExpress;
    case 'fastify': return featuresFastify;
    case 'go':      return featuresGo;
    case 'python':  return featuresPython;
    default:        return features;
  }
}

async function ensurePrerequisites(tools) {
  if (!tools || !tools.length) return true;
  const results = checkAll(tools);
  const missing = results.filter((r) => !r.installed);
  if (!missing.length) return true;

  missing.forEach((m) => log.fail(`${m.tool} is not installed`));
  const { shouldInstall } = await inquirer.prompt([{
    type: 'confirm', name: 'shouldInstall',
    message: `Install ${missing.map((m) => m.tool).join(', ')} now?`,
    default: true,
  }]);
  if (!shouldInstall) {
    log.warn('Without these prerequisites, the generated project may not run.');
    return true;
  }
  for (const m of missing) {
    try { await installTool(m.tool); log.ok(`${m.tool} installed`); }
    catch (err) { log.fail(err.message); }
  }
  return true;
}

async function askCoreStack(fm, ctx) {
  tui.section('Stack Configuration');

  const { orm } = await inquirer.prompt([{
    type: 'list', name: 'orm', message: 'Data layer / ORM?',
    choices: withBack(fm.ormChoices()),
  }]);
  if (orm === '__back__') return '__back__';

  let database = 'none';
  if (orm !== 'none') {
    const dbChoices = fm.databaseChoices(orm);
    if (dbChoices.length === 1) {
      database = dbChoices[0].value;
      log.info(`   Database: ${dbChoices[0].name} (the only option ${orm} supports)`);
    } else {
      const answer = await inquirer.prompt([{
        type: 'list', name: 'database', message: 'Database?',
        choices: withBack(dbChoices),
      }]);
      if (answer.database === '__back__') return '__back__';
      database = answer.database;
    }
  }

  const { validation } = await inquirer.prompt([{
    type: 'list', name: 'validation', message: 'Validation & transformation?',
    choices: withBack(fm.validationChoices()),
  }]);
  if (validation === '__back__') return '__back__';

  const { useRedis } = await inquirer.prompt([{
    type: 'confirm', name: 'useRedis', message: 'Add Redis for caching?', default: false,
  }]);
  if (useRedis === '__back__') return '__back__';

  const { broker } = await inquirer.prompt([{
    type: 'list', name: 'broker', message: 'Message broker?',
    choices: withBack(fm.brokerChoices()),
  }]);
  if (broker === '__back__') return '__back__';

  const { useAgentDocs } = await inquirer.prompt([{
    type: 'confirm', name: 'useAgentDocs',
    message: 'Generate AGENT.md files for AI-assisted development?', default: true,
  }]);

  return { orm, database, validation, useRedis, broker, useAgentDocs };
}

async function askStack(ctx, nav) {
  const tf = ctx._templateConfig;
  const flavor = tf.stackFeatures;
  if (!flavor) return {};

  const fm = resolveFeatures(flavor);
  const core = await askCoreStack(fm, ctx);
  if (core === '__back__') return '__back__';

  if (fm.extraFeatureChoices) {
    const { extras } = await inquirer.prompt([{
      type: 'checkbox', name: 'extras',
      message: 'Additional features (space to toggle)?',
      choices: withBack(fm.extraFeatureChoices()),
    }]);
    if (extras.includes('__back__')) return '__back__';
    return Object.assign({}, core, { extras });
  }
  return core;
}

async function askModules(ctx, nav) {
  const tc = ctx._templateConfig;
  if (!tc.modules || !tc.modules.enabled) return { modules: [] };

  tui.section('Modules');

  const { moduleCount } = await inquirer.prompt([{
    type: 'input', name: 'moduleCount',
    message: 'How many modules/entities do you want to scaffold?',
    default: '1',
    validate: (v) => {
      if (v === ':b') return true; // back signal
      const n = Number(v);
      return (Number.isInteger(n) && n >= 1 && n <= 20) || 'Enter a whole number between 1 and 20';
    },
  }]);
  if (moduleCount === ':b') return '__back__';

  const count = Number(moduleCount);
  const modules = [];
  for (let i = 0; i < count; i++) {
    const { moduleName } = await inquirer.prompt([{
      type: 'input', name: 'moduleName',
      message: `${tc.modules.message} [${i + 1}/${count}]`,
      default: i === 0 ? tc.modules.default : undefined,
      validate: (v) => {
        if (v === ':b') return true;
        if (!/^[a-z][a-z0-9-]*$/.test(v))
          return 'Start with a lowercase letter; use lowercase letters, numbers, and hyphens only';
        if (modules.includes(v)) return `"${v}" was already added — pick a different name`;
        return true;
      },
    }]);
    if (moduleName === ':b') return '__back__';
    modules.push(moduleName);
  }
  return { modules };
}

function buildContext(flags, modules, baseAnswers, ctx) {
  const flavor = ctx._templateConfig.stackFeatures;
  const fm = resolveFeatures(flavor);

  const fullCtx = Object.assign({}, baseAnswers, flags, ctx, {
    modules,
    dbName: String(baseAnswers.projectName).replace(/-/g, '_').toLowerCase(),
  });

  if (flavor === 'go') {
    const deps = fm.resolveDependencies(flags);
    fullCtx.goModules = deps.goModules;
  } else if (flavor === 'python') {
    const deps = fm.resolveDependencies(flags);
    fullCtx.requirementsTxt = deps.requirements.join('\n') + '\n';
    if (deps.devRequirements && deps.devRequirements.length > 0)
      fullCtx.devRequirementsTxt = deps.devRequirements.join('\n') + '\n';
  } else if (flavor) {
    const deps = fm.resolveDependencies(flags);
    fullCtx.dependenciesJson = JSON.stringify(deps.dependencies, null, 4).replace(/\n/g, '\n  ');
    fullCtx.devDependenciesJson = JSON.stringify(deps.devDependencies, null, 4).replace(/\n/g, '\n  ');
    fullCtx.scriptsJson = JSON.stringify(fm.resolveScripts(flags), null, 4).replace(/\n/g, '\n  ');
    if (flags.useTests && fm.resolveJestConfig)
      fullCtx.jestConfigJson = JSON.stringify(fm.resolveJestConfig(), null, 4).replace(/\n/g, '\n  ');
  }

  return fullCtx;
}

async function renderProject(ctx) {
  const outDir = path.resolve(process.cwd(), ctx.projectName);
  if (await fs.pathExists(outDir)) {
    log.fail(`Directory "${ctx.projectName}" already exists.`);
    process.exit(1);
  }

  const tc = ctx._templateConfig;
  const templateDir = path.join(TEMPLATES_ROOT, ctx._templateName);
  const shouldInclude = makeIncludeCheck(tc.fileConditions, ctx);
  const modules = ctx.modules || [];

  const sp = tui.spirit('Generating files...');
  try {
    await fs.ensureDir(outDir);

    if (tc.shared) {
      const sharedFiles = path.join(TEMPLATES_ROOT, tc.shared, 'files');
      if (await fs.pathExists(sharedFiles))
        await renderTemplateDir(sharedFiles, outDir, ctx, shouldInclude);
    }

    await renderTemplateDir(path.join(templateDir, 'files'), outDir, ctx, shouldInclude);

    const moduleFilesDir = path.join(templateDir, 'moduleFiles');
    if (modules.length && (await fs.pathExists(moduleFilesDir)))
      await renderModuleFiles(moduleFilesDir, outDir, ctx, modules, shouldInclude);

    sp.succeed(chalk.green(`Files generated (${modules.length} module${modules.length === 1 ? '' : 's'})`));
  } catch (err) {
    sp.fail(chalk.red(err.message));
    process.exit(1);
  }

  if (tc.postInstall && tc.postInstall.includes('npm install')) {
    tui.section('Installing dependencies');
    const npmPath = resolveCommandPath('npm');
    if (!npmPath) {
      log.fail('Could not resolve npm on PATH.');
      log.warn(`Run manually: cd ${ctx.projectName} && npm install`);
    } else {
      try {
        await run(npmPath, ['install'], { cwd: outDir, stdio: 'inherit' });
        log.ok('npm install done');
      } catch (err) {
        log.fail(err.message);
        log.warn(`Run manually: cd ${ctx.projectName} && npm install`);
      }
    }
  }

  if (tc.postInstall && tc.postInstall.includes('go mod tidy')) {
    tui.section('Go modules');
    log.info(`Next: cd ${ctx.projectName} && go mod tidy`);
  }

  if (ctx._stackFlavor === 'python') {
    tui.section('Python dependencies');
    log.info('Next steps:');
    log.info('  python3 -m venv venv && source venv/bin/activate');
    log.info('  pip install -r requirements.txt');
  }

  if (tc.gitInit) {
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
      } catch { sg.warn('Run git init manually'); }
    }
  }

  return outDir;
}

// ---- Wizard step functions (each takes ctx, nav) ----

async function stepMode(ctx, nav) {
  const { mode } = await inquirer.prompt([{
    type: 'list', name: 'mode', message: 'What would you like to build?',
    choices: [
      { name: 'Single service', value: 'single' },
      { name: 'Microservices (multiple services)', value: 'multi' },
    ],
  }]);
  ctx._mode = mode;
  return { _mode: mode };
}

async function stepLanguage(ctx, nav) {
  const langs = getLanguages(_manifest);
  const { language } = await inquirer.prompt([{
    type: 'list', name: 'language', message: 'Pick a language:',
    choices: withBack(langs),
  }]);
  if (language === '__back__') return '__back__';
  return { language };
}

async function stepFramework(ctx, nav) {
  const fws = getFrameworks(_manifest, ctx.language);
  const { framework } = await inquirer.prompt([{
    type: 'list', name: 'framework', message: 'Pick a framework:',
    choices: withBack(fws),
  }]);
  if (framework === '__back__') return '__back__';
  return { framework };
}

async function stepArchitecture(ctx, nav) {
  const archs = getArchitectures(_manifest, ctx.language, ctx.framework);
  const { architecture } = await inquirer.prompt([{
    type: 'list', name: 'architecture', message: 'Pick an architecture:',
    choices: withBack(archs),
  }]);
  if (architecture === '__back__') return '__back__';
  const architectureLabel = (archs.find((c) => c.value === architecture) || {}).name || architecture;

  const templateName = getTemplateDir(_manifest, ctx.language, ctx.framework, architecture);
  const templateDir = path.join(TEMPLATES_ROOT, templateName);
  const templateConfig = await fs.readJson(path.join(templateDir, 'template.json'));

  return {
    architecture,
    architectureLabel,
    _templateName: templateName,
    _templateDir: templateDir,
    _templateConfig: templateConfig,
    _stackFlavor: templateConfig.stackFeatures,
  };
}

async function stepPrerequisites(ctx, nav) {
  await ensurePrerequisites(ctx._templateConfig.prerequisites);
  return {};
}

async function stepProject(ctx, nav) {
  tui.section('Project Details');
  const answers = await inquirer.prompt([
    {
      type: 'input', name: 'projectName', message: 'Project name?',
      validate: (v) => {
        if (v === ':b') return true;
        return /^[a-z0-9-]+$/.test(v) || 'Lowercase letters, numbers, and hyphens only';
      },
    },
    {
      type: 'input', name: 'author', message: 'Your full name?',
      validate: (v) => {
        if (v === ':b') return true;
        return v.trim().length > 0;
      },
    },
    {
      type: 'input', name: 'github', message: 'GitHub username?',
      validate: (v) => {
        if (v === ':b') return true;
        return /^[a-zA-Z0-9-]+$/.test(v);
      },
    },
    {
      type: 'input', name: 'description', message: 'Short description?',
      default: 'Built with pasha CLI',
    },
  ]);
  if (Object.values(answers).some((v) => v === ':b')) return '__back__';
  return answers;
}

async function stepStack(ctx, nav) {
  const result = await askStack(ctx, nav);
  return result;
}

async function stepModules(ctx, nav) {
  const list = await askModules(ctx, nav);
  if (list === '__back__') return '__back__';
  if (Array.isArray(list.modules)) return { modules: list.modules };
  return { modules: list.modules || [] };
}

async function stepReview(ctx, nav) {
  const flavor = ctx._stackFlavor;
  const fm = resolveFeatures(flavor);
  const flags = flavor ? fm.deriveFlags(Object.assign(
    {},
    ctx.orm ? { orm: ctx.orm, database: ctx.database, validation: ctx.validation,
      broker: ctx.broker, useRedis: ctx.useRedis, useAgentDocs: ctx.useAgentDocs,
      extras: ctx.extras } : {}
  )) : {};

  const fullCtx = buildContext(flags, ctx.modules || [], ctx, ctx);

  if (ctx._mode !== 'multi') {
    tui.summary(fullCtx);
  }

  const { action } = await inquirer.prompt([{
    type: 'list', name: 'action', message: 'Ready to scaffold?',
    choices: [
      { name: chalk.green('✓ Generate project'), value: '__confirm__' },
      { name: chalk.dim('← Go back and change something'), value: '__back__' },
      { name: chalk.red('✗ Cancel'), value: '__cancel__' },
    ],
  }]);

  if (action === '__cancel__') {
    log.warn('Aborted. No files were created.');
    process.exit(0);
  }
  if (action === '__back__') return '__back__';

  // Merge computed flags into context for rendering
  return Object.assign({}, fullCtx, { _confirmed: true });
}

// ---- Microservice mode ----

async function runMicroservices(ctx) {
  tui.chat('Microservices Mode', [
    `You'll configure each service independently.`,
    `All services share a root docker-compose and project directory.`,
  ]);

  const services = [];

  const { count } = await inquirer.prompt([{
    type: 'input', name: 'count', message: 'How many services?', default: '2',
    validate: (v) => {
      const n = Number(v);
      return (Number.isInteger(n) && n >= 2 && n <= 10) || 'Enter a number between 2 and 10';
    },
  }]);

  for (let i = 0; i < Number(count); i++) {
    tui.serviceHeader(i + 1, Number(count), `Service #${i + 1}`);

    const steps = [
      { name: 'language',     label: 'Language',     run: stepLanguage },
      { name: 'framework',    label: 'Framework',    run: stepFramework },
      { name: 'architecture', label: 'Architecture', run: stepArchitecture },
      { name: 'prereqs',      label: 'Prerequisites', run: stepPrerequisites },
      { name: 'project',      label: 'Service Info', run: stepProject },
      { name: 'stack',        label: 'Stack',        run: stepStack },
      { name: 'modules',      label: 'Modules',      run: stepModules },
    ];

    const nav = new Navigator(steps);
    const svcCtx = await nav.start({
      projectName: `${ctx.projectName}-svc${i + 1}`,
      author: ctx.author,
      github: ctx.github,
      description: `Service ${i + 1} of ${ctx.projectName}`,
    });

    const flavor = svcCtx._stackFlavor;
    const fm = resolveFeatures(flavor);
    const flags = flavor ? fm.deriveFlags(Object.assign(
      {}, svcCtx,
      svcCtx.orm ? { orm: svcCtx.orm, database: svcCtx.database,
        validation: svcCtx.validation, broker: svcCtx.broker,
        useRedis: svcCtx.useRedis, useAgentDocs: svcCtx.useAgentDocs,
        extras: svcCtx.extras } : {}
    )) : {};

    const finalCtx = buildContext(flags, svcCtx.modules || [], svcCtx, svcCtx);
    services.push(finalCtx);

    tui.serviceSummary(i + 1, Number(count), finalCtx);
  }

  // Render all services
  tui.divider();
  for (const svc of services) {
    tui.serviceHeader(services.indexOf(svc) + 1, services.length, svc.projectName);
    const outDir = await renderProject(svc);
    tui.done(outDir, svc);
    await history.saveSession(svc);
  }

  tui.chat('All services scaffolded', [
    `Each service is in its own directory.`,
    `Add a root docker-compose.yml to orchestrate them together.`,
  ]);
}

// ---- Main ----

async function create(options = {}) {
  tui.welcome();

  if (options.resume) {
    const sessions = await history.listSessions(10);
    if (sessions.length) {
      const { idx } = await inquirer.prompt([{
        type: 'list', name: 'idx',
        message: 'Resume a previous session:',
        choices: [
          { name: 'Start new', value: -1 },
          ...sessions.map((s, i) => ({
            name: `${s.projectName} · ${s.framework || '?'} · ${s.architecture || '?'}`,
            value: i,
          })),
        ],
      }]);
      if (idx !== -1) {
        const s = await fs.readJson(sessions[idx].path);
        log.ok(`Loaded: ${s.projectName}`);
        // Pre-fill from session — simplified: use session answers as defaults
      }
    }
  }

  let manifest;
  try { manifest = await loadManifest(); }
  catch (err) {
    log.fail(`Failed to load template manifest: ${err.message}`);
    process.exit(1);
  }
  _manifest = manifest;

  // Mode selection
  const { mode } = await inquirer.prompt([{
    type: 'list', name: 'mode', message: 'What would you like to build?',
    choices: [
      { name: chalk.bold('Single service'), value: 'single' },
      { name: chalk.cyan('Microservices (multi-service)'), value: 'multi' },
    ],
  }]);

  if (mode === 'multi') {
    // Ask project-level info first
    tui.section('Project Info');
    const base = await inquirer.prompt([
      { type: 'input', name: 'projectName', message: 'Root project name?', validate: (v) => /^[a-z0-9-]+$/.test(v) },
      { type: 'input', name: 'author', message: 'Your full name?', validate: (v) => v.trim().length > 0 },
      { type: 'input', name: 'github', message: 'GitHub username?', validate: (v) => /^[a-zA-Z0-9-]+$/.test(v) },
      { type: 'input', name: 'description', message: 'Short description?', default: 'Built with pasha CLI' },
    ]);
    await runMicroservices(base);
    return;
  }

  // Single service flow with Navigator
  const steps = [
    { name: 'language',     label: 'Language',       run: stepLanguage },
    { name: 'framework',    label: 'Framework',       run: stepFramework },
    { name: 'architecture', label: 'Architecture',    run: stepArchitecture },
    { name: 'prereqs',      label: 'Prerequisites',   run: stepPrerequisites },
    { name: 'project',      label: 'Project Info',    run: stepProject },
    { name: 'stack',        label: 'Stack',           run: stepStack },
    { name: 'modules',      label: 'Modules',         run: stepModules },
    { name: 'review',       label: 'Review',          run: stepReview },
  ];

  const nav = new Navigator(steps);
  const ctx = await nav.start();

  if (!ctx._confirmed) {
    log.warn('Aborted.');
    process.exit(0);
  }

  const outDir = await renderProject(ctx);
  await history.saveSession(ctx);
  tui.done(outDir, ctx);
}

module.exports = { create };
