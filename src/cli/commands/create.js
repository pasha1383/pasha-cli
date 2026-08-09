'use strict';
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const os = require('os');

const log = require('../../utils/logger');
const { run } = require('../../core/system/exec');
const { loadManifest, getLanguages, getFrameworks, getArchitectures, getTemplateDir } = require('../../core/catalog/manifest');
const { loadTemplateConfig } = require('../../core/catalog/template-config');
const { renderTemplateDir, renderModuleFiles } = require('../../core/engine/renderer');
const { makeIncludeCheck } = require('../../core/engine/conditions');
const { checkAll, installTool, resolveCommandPath } = require('../../core/system/prerequisites');
const { resolveFeatures } = require('../../core/features/index');
const { Navigator } = require('../../core/wizard/navigator');
const { prompt } = require('../../ui/prompts');
const { welcome } = require('../../ui/screens/welcome');
const { summary } = require('../../ui/screens/summary');
const { done } = require('../../ui/screens/done');
const { error, section, divider } = require('../../ui/screens/error');
const { Spinner } = require('../../ui/screens/progress');
const history = require('../../core/session/history');
const { loadPreset, savePreset } = require('../../core/session/presets');

const TEMPLATES_ROOT = path.join(__dirname, '../../../templates');

let _manifest = null;

function progressHeader(current, total, label) {
  const barWidth = 20;
  const filled = Math.round((current / total) * barWidth);
  const empty = barWidth - filled;
  const bar = chalk.cyan('█'.repeat(filled) + '░'.repeat(empty));
  console.log('');
  console.log(chalk.bold(`  Step ${current}/${total}  ${bar}  ${label}`));
  console.log('');
}

function backChoice() {
  return { name: chalk.dim('← Go back'), value: '__back__' };
}

function withBack(choices, nav) {
  if (nav && nav.currentIndex > 0) {
    return [backChoice(), ...choices];
  }
  return [...choices];
}

async function ensurePrerequisites(tools) {
  if (!tools || !tools.length) return true;
  const results = checkAll(tools);
  const missing = results.filter((r) => !r.installed);
  if (!missing.length) return true;

  missing.forEach((m) => log.fail(`${m.tool} is not installed`));
  const { shouldInstall } = await prompt([{
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

async function askCoreStack(fm, ctx, nav, startStep = 0) {
  section('Stack Configuration');

  const ormChoices = fm.ormChoices(ctx.framework);

  // Persistent state so each sub-step remembers its answer across step-by-step back
  const answers = {
    orm: ctx.orm || undefined,
    database: ctx.database || undefined,
    validation: ctx.validation || undefined,
    useRedis: ctx.useRedis !== undefined ? ctx.useRedis : undefined,
    broker: ctx.broker || undefined,
    useAgentDocs: ctx.useAgentDocs !== undefined ? ctx.useAgentDocs : undefined,
  };

  // Sub-step index: 0=orm, 1=database, 2=validation, 3=redis, 4=broker, 5=agentdocs
  // On back: decrement (go to previous sub-step). On forward: increment.
  // Only back from step 0 returns '__back__' to the wizard navigator.
  let step = startStep;

  while (step >= 0 && step <= 5) {
    switch (step) {
      // ---- 0: ORM ----
      case 0:
        if (ormChoices.length === 1) {
          answers.orm = ormChoices[0].value;
          log.info(`   ORM: ${ormChoices[0].name} (the only option for ${ctx.framework})`);
          step++;
        } else {
          const a = await prompt([{
            type: 'list', name: 'orm', message: 'Data layer / ORM?',
            choices: withBack(ormChoices, nav),
            default: answers.orm || undefined,
          }]);
          if (a.orm === '__back__') return '__back__';
          answers.orm = a.orm;
          step++;
        }
        break;

      // ---- 1: Database ----
      case 1:
        if (answers.orm !== 'none') {
          const dbChoices = fm.databaseChoices(answers.orm);
          if (dbChoices.length === 1) {
            answers.database = dbChoices[0].value;
            log.info(`   Database: ${dbChoices[0].name} (the only option ${answers.orm} supports)`);
            step++;
          } else {
            const a = await prompt([{
              type: 'list', name: 'database', message: 'Database?',
              choices: withBack(dbChoices, nav),
              default: (answers.database && answers.database !== 'none') ? answers.database : undefined,
            }]);
            if (a.database === '__back__') { step--; break; }
            answers.database = a.database;
            step++;
          }
        } else {
          answers.database = 'none';
          step++;
        }
        break;

      // ---- 2: Validation ----
      case 2: {
        const a = await prompt([{
          type: 'list', name: 'validation', message: 'Validation & transformation?',
          choices: withBack(fm.validationChoices(), nav),
          default: answers.validation || undefined,
        }]);
        if (a.validation === '__back__') { step--; break; }
        answers.validation = a.validation;
        step++;
        break;
      }

      // ---- 3: Redis ----
      case 3: {
        const a = await prompt([{
          type: 'confirm', name: 'useRedis', message: 'Add Redis for caching?',
          default: answers.useRedis !== undefined ? Boolean(answers.useRedis) : false,
        }]);
        // Confirm has no back — just move forward
        answers.useRedis = a.useRedis;
        step++;
        break;
      }

      // ---- 4: Broker ----
      case 4: {
        const a = await prompt([{
          type: 'list', name: 'broker', message: 'Message broker?',
          choices: withBack(fm.brokerChoices(), nav),
          default: answers.broker || undefined,
        }]);
        if (a.broker === '__back__') { step--; break; }
        answers.broker = a.broker;
        step++;
        break;
      }

      // ---- 5: AGENT.md ----
      case 5: {
        const a = await prompt([{
          type: 'confirm', name: 'useAgentDocs',
          message: 'Generate AGENT.md files for AI-assisted development?',
          default: answers.useAgentDocs !== undefined ? answers.useAgentDocs : true,
        }]);
        answers.useAgentDocs = a.useAgentDocs;
        step++;
        break;
      }
    }
  }

  return {
    orm: answers.orm,
    database: answers.database || 'none',
    validation: answers.validation,
    useRedis: answers.useRedis,
    broker: answers.broker || 'none',
    useAgentDocs: answers.useAgentDocs,
  };
}

async function askStack(ctx, nav) {
  const tf = ctx._templateConfig;
  const flavor = tf.stackFeatures;
  if (!flavor) return {};

  const fm = resolveFeatures(flavor);

  // Internal loop: going back from extras re-enters the stack.
  // Persist extras selection across re-loops.
  let extras = ctx.extras;
  let stepHint = 0;

  while (true) {
    const core = await askCoreStack(fm, ctx, nav, stepHint);
    if (core === '__back__') return '__back__';

    if (fm.extraFeatureChoices) {
      // Pre-check previously selected extras
      const choices = fm.extraFeatureChoices().map(c => ({
        ...c,
        checked: extras ? extras.includes(c.value) : c.checked,
      }));

      const answer = await prompt([{
        type: 'checkbox', name: 'extras',
        message: 'Additional features (space to toggle)?',
        choices: withBack(choices, nav),
      }]);
      if (answer.extras.includes('__back__')) {
        // Go back to the last core sub-step (agentdocs, step 5)
        stepHint = 5;
        continue;
      }
      extras = answer.extras;
    }

    stepHint = 0;
    return Object.assign({}, core, { extras: extras || [] });
  }
}

async function askModules(ctx, nav) {
  const tc = ctx._templateConfig;
  if (!tc.modules || !tc.modules.enabled) return { modules: [] };

  section('Modules');

  const existingModules = ctx.modules || [];

  // Internal loop: going back from a module name restarts at the count prompt
  while (true) {
    const defaultCount = existingModules.length > 0 ? String(existingModules.length) : '1';

    const { moduleCount } = await prompt([{
      type: 'input', name: 'moduleCount',
      message: 'How many modules/entities do you want to scaffold?',
      default: defaultCount,
      validate: (v) => {
        if (!v || v.trim() === '') return 'Please enter a number between 1 and 20';
        const n = Number(v);
        if (!Number.isInteger(n)) return 'Enter a whole number (e.g. 3), not a decimal';
        if (n < 1) return 'Enter at least 1 module';
        if (n > 20) return 'Maximum 20 modules per project';
        return true;
      },
    }]);
    if (moduleCount === '__back__') return '__back__';

    const count = Number(moduleCount);
    const modules = [];
    for (let i = 0; i < count; i++) {
      const defaultName = existingModules[i] || undefined;

      const { moduleName } = await prompt([{
        type: 'input', name: 'moduleName',
        message: `${tc.modules.message} [${i + 1}/${count}]`,
        default: defaultName || (i === 0 ? tc.modules.default : undefined),
        validate: (v) => {
          if (!v || v.trim() === '') return 'Module name cannot be empty';
          if (!/^[a-z][a-z0-9-]*$/.test(v))
            return 'Start with a lowercase letter; use lowercase letters, numbers, and hyphens only';
          if (modules.includes(v)) return `"${v}" was already added — pick a different name`;
          return true;
        },
      }]);
      if (moduleName === '__back__') {
        // Go back to count prompt (outer loop will restart)
        break;
      }
      modules.push(moduleName);
    }

    // If we collected all modules without going back, return them
    if (modules.length === count) {
      return { modules };
    }
    // Otherwise continue the outer loop (restart from count)
  }
}

function buildContext(flags, modules, baseAnswers, ctx) {
  const flavor = ctx._templateConfig.stackFeatures;
  const fm = resolveFeatures(flavor);

  const fullCtx = Object.assign({}, baseAnswers, ctx, flags, {
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

  const sp = new Spinner('Generating files...').start();
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
    section('Installing dependencies');
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

  if (tc.gitInit) {
    const { doGit } = await prompt([
      { type: 'confirm', name: 'doGit', message: 'Run git init and first commit?', default: true },
    ]);
    if (doGit) {
      const sg = new Spinner('Setting up git...').start();
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

async function writePashaJson(outDir, fullCtx) {
  try {
    await fs.writeJson(path.join(outDir, '.pasha.json'), {
      version: require('../../../package.json').version,
      template: fullCtx._templateName,
      stackFeatures: fullCtx._stackFlavor,
      language: fullCtx.language,
      framework: fullCtx.framework,
      architecture: fullCtx.architecture,
      context: {
        projectName: fullCtx.projectName,
        author: fullCtx.author,
        github: fullCtx.github,
        description: fullCtx.description,
        orm: fullCtx.orm,
        database: fullCtx.database,
        validation: fullCtx.validation,
        useRedis: Boolean(fullCtx.useRedis),
        broker: fullCtx.broker || 'none',
        useAgentDocs: fullCtx.useAgentDocs !== false,
        extras: fullCtx.extras || [],
        modules: fullCtx.modules || [],
      },
    }, { spaces: 2 });
  } catch (e) { /* non-critical */ }
}

async function renderProjectDry(ctx) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pasha-dry-'));
  const tc = ctx._templateConfig;
  const templateDir = path.join(TEMPLATES_ROOT, ctx._templateName);
  const shouldInclude = makeIncludeCheck(tc.fileConditions, ctx);
  const modules = ctx.modules || [];

  try {
    await fs.ensureDir(tmpDir);

    if (tc.shared) {
      const sharedFiles = path.join(TEMPLATES_ROOT, tc.shared, 'files');
      if (await fs.pathExists(sharedFiles))
        await renderTemplateDir(sharedFiles, tmpDir, ctx, shouldInclude);
    }

    await renderTemplateDir(path.join(templateDir, 'files'), tmpDir, ctx, shouldInclude);

    const moduleFilesDir = path.join(templateDir, 'moduleFiles');
    if (modules.length && (await fs.pathExists(moduleFilesDir)))
      await renderModuleFiles(moduleFilesDir, tmpDir, ctx, modules, shouldInclude);

    const files = [];
    async function walk(dir, prefix) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const rel = path.join(prefix, e.name);
        if (e.isDirectory()) {
          await walk(path.join(dir, e.name), rel);
        } else {
          files.push(rel);
        }
      }
    }
    await walk(tmpDir, '');

    section('Dry Run — Files that would be generated');
    const sorted = files.sort();
    for (const f of sorted) {
      console.log(`  ${chalk.dim(f)}`);
    }
    console.log('');
    log.info(`${sorted.length} file${sorted.length !== 1 ? 's' : ''} would be written to "${ctx.projectName}/"`);
  } finally {
    await fs.remove(tmpDir);
  }
}

async function stepLanguage(ctx, nav) {
  progressHeader(nav.currentIndex + 1, nav.totalSteps, nav.currentStep.label);
  const langs = getLanguages(_manifest);
  const defaultVal = ctx.language || undefined;
  const { language } = await prompt([{
    type: 'list', name: 'language', message: 'Pick a language:',
    choices: withBack(langs, nav),
    default: defaultVal,
  }]);
  if (language === '__back__') return '__back__';
  return { language };
}

async function stepFramework(ctx, nav) {
  progressHeader(nav.currentIndex + 1, nav.totalSteps, nav.currentStep.label);
  const fws = getFrameworks(_manifest, ctx.language);
  const defaultVal = ctx.framework || undefined;
  const { framework } = await prompt([{
    type: 'list', name: 'framework', message: 'Pick a framework:',
    choices: withBack(fws, nav),
    default: defaultVal,
  }]);
  if (framework === '__back__') return '__back__';
  return { framework };
}

async function stepArchitecture(ctx, nav) {
  progressHeader(nav.currentIndex + 1, nav.totalSteps, nav.currentStep.label);
  const archs = getArchitectures(_manifest, ctx.language, ctx.framework);
  const defaultVal = ctx.architecture || undefined;
  const { architecture } = await prompt([{
    type: 'list', name: 'architecture', message: 'Pick an architecture:',
    choices: withBack(archs, nav),
    default: defaultVal,
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
  progressHeader(nav.currentIndex + 1, nav.totalSteps, nav.currentStep.label);
  await ensurePrerequisites(ctx._templateConfig.prerequisites);
  return {};
}

async function stepProject(ctx, nav) {
  progressHeader(nav.currentIndex + 1, nav.totalSteps, nav.currentStep.label);
  const answers = await prompt([
    {
      type: 'input', name: 'projectName', message: 'Project name?',
      default: ctx.projectName || undefined,
      validate: (v) => {
        if (!v || v.trim() === '') return 'Project name cannot be empty';
        return /^[a-z0-9-]+$/.test(v) || 'Use only lowercase letters, numbers, and hyphens (e.g. my-api)';
      },
    },
    {
      type: 'input', name: 'author', message: 'Your full name?',
      default: ctx.author || undefined,
      validate: (v) => {
        if (!v || v.trim().length === 0) return 'Please enter your name';
        return true;
      },
    },
    {
      type: 'input', name: 'github', message: 'GitHub username?',
      default: ctx.github || undefined,
      validate: (v) => {
        if (!v || v.trim() === '') return 'GitHub username cannot be empty';
        return /^[a-zA-Z0-9-]+$/.test(v) || 'Use only letters, numbers, and hyphens (e.g. johndoe)';
      },
    },
    {
      type: 'input', name: 'description', message: 'Short description?',
      default: ctx.description || 'Built with pasha CLI',
    },
  ]);
  return answers;
}

async function stepStack(ctx, nav) {
  progressHeader(nav.currentIndex + 1, nav.totalSteps, nav.currentStep.label);
  const result = await askStack(ctx, nav);
  return result;
}

async function stepModules(ctx, nav) {
  progressHeader(nav.currentIndex + 1, nav.totalSteps, nav.currentStep.label);
  const list = await askModules(ctx, nav);
  if (list === '__back__') return '__back__';
  if (Array.isArray(list.modules)) return { modules: list.modules };
  return { modules: list.modules || [] };
}

async function stepReview(ctx, nav) {
  progressHeader(nav.currentIndex + 1, nav.totalSteps, nav.currentStep.label);
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
    summary(fullCtx);
  }

  const { action } = await prompt([{
    type: 'list', name: 'action', message: 'Ready to scaffold?',
    choices: [
      { name: chalk.green('✓ Generate project'), value: '__confirm__', description: 'Create the project directory with all generated files' },
      { name: chalk.dim('← Go back and change something'), value: '__back__', description: 'Return to previous steps to adjust your choices' },
      { name: chalk.red('✗ Cancel'), value: '__cancel__', description: 'Exit without creating any files' },
    ],
  }]);

  if (action === '__cancel__') {
    log.warn('Aborted. No files were created.');
    process.exit(0);
  }
  if (action === '__back__') return '__back__';

  return Object.assign({}, fullCtx, { _confirmed: true });
}

async function runMicroservices(ctx) {
  console.log('');
  console.log(chalk.bold('  Microservices Mode'));
  console.log(chalk.dim('  You\'ll configure each service independently.'));
  console.log(chalk.dim('  All services share a root docker-compose and project directory.'));
  console.log('');

  const services = [];

  const { count } = await prompt([{
    type: 'input', name: 'count', message: 'How many services?', default: '2',
    validate: (v) => {
      const n = Number(v);
      if (!Number.isInteger(n)) return 'Enter a whole number';
      if (n < 2) return 'You need at least 2 services for microservices mode';
      if (n > 10) return 'Maximum 10 services per project';
      return true;
    },
  }]);

  for (let i = 0; i < Number(count); i++) {
    const svcNum = i + 1;
    const svcLabel = `Service #${svcNum}`;
    console.log('');
    console.log(chalk.bold(`  ${chalk.cyan('Service ' + svcNum + '/' + count)}  ${svcLabel}`));
    console.log('');

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
      projectName: `${ctx.projectName}-svc${svcNum}`,
      author: ctx.author,
      github: ctx.github,
      description: `Service ${svcNum} of ${ctx.projectName}`,
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

    summary(finalCtx);
  }

  divider();
  for (const svc of services) {
    const idx = services.indexOf(svc) + 1;
    console.log('');
    console.log(chalk.bold(`  ${chalk.cyan('Service ' + idx + '/' + services.length)}  ${svc.projectName}`));
    console.log('');
    const outDir = await renderProject(svc);
    done(outDir, svc);
    await history.saveSession(svc);
    await writePashaJson(outDir, svc);
  }

  console.log('');
  console.log(chalk.bold('  All services scaffolded'));
  console.log(chalk.dim('  Each service is in its own directory.'));
  console.log(chalk.dim('  Add a root docker-compose.yml to orchestrate them together.'));
  console.log('');
}

function hasEnoughCliFlags(opts) {
  return !!(opts.language && opts.framework && opts.architecture);
}

async function resolveTemplateInfo(lang, fw, arch) {
  const manifest = _manifest || await loadManifest();

  const langExists = getLanguages(manifest).some((l) => l.value === lang);
  if (!langExists) throw new Error(`Unknown language: "${lang}"`);

  const fwExists = getFrameworks(manifest, lang).some((f) => f.value === fw);
  if (!fwExists) throw new Error(`Unknown framework "${fw}" for language "${lang}"`);

  const archs = getArchitectures(manifest, lang, fw);
  const archExists = archs.some((a) => a.value === arch);
  if (!archExists) throw new Error(`Unknown architecture "${arch}" for ${fw}`);

  const architectureLabel = (archs.find((a) => a.value === arch) || {}).name || arch;
  const templateName = getTemplateDir(manifest, lang, fw, arch);
  const templateDir = path.join(TEMPLATES_ROOT, templateName);
  const templateConfig = await fs.readJson(path.join(templateDir, 'template.json'));

  return {
    architectureLabel,
    _templateName: templateName,
    _templateDir: templateDir,
    _templateConfig: templateConfig,
    _stackFlavor: templateConfig.stackFeatures,
    _manifest: manifest,
  };
}

async function createNonInteractive(opts) {
  const lang = opts.language || 'node';
  const fw = opts.framework || 'nestjs';
  const arch = opts.architecture || 'layered';

  const ti = await resolveTemplateInfo(lang, fw, arch);
  const flavor = ti._stackFlavor;
  const fm = resolveFeatures(flavor);

  const orm = opts.orm || (fm.ormChoices(fw)[0] && fm.ormChoices(fw)[0].value) || 'none';
  let database = opts.database || 'none';
  if (orm !== 'none' && database === 'none') {
    const dbChoices = fm.databaseChoices(orm);
    if (dbChoices.length > 0) database = dbChoices[0].value;
  }
  const validation = opts.validation || (fm.validationChoices()[0] && fm.validationChoices()[0].value) || 'none';
  const useRedis = opts.redis !== undefined ? Boolean(opts.redis) : false;
  const broker = opts.broker || 'none';
  const useAgentDocs = opts.agentDocs !== undefined ? Boolean(opts.agentDocs) : true;
  const extras = opts.extras ? opts.extras.split(',').map((s) => s.trim()).filter(Boolean) : ['swagger', 'lint', 'tests', 'health'];
  const modules = opts.modules ? opts.modules.split(',').map((s) => s.trim()).filter(Boolean) : ['product'];

  const projectName = opts.projectName || 'my-project';
  const author = opts.author || process.env.USER || process.env.USERNAME || 'Developer';
  const github = opts.github || 'developer';
  const description = opts.description || 'Built with pasha CLI';

  const stackAnswers = { orm, database, validation, useRedis, broker, useAgentDocs, extras };

  const flags = flavor ? fm.deriveFlags(stackAnswers) : {};

  const ctx = Object.assign(
    {
      language: lang,
      framework: fw,
      architecture: arch,
      projectName,
      author,
      github,
      description,
      _mode: 'single',
    },
    ti,
    stackAnswers
  );

  const fullCtx = buildContext(flags, modules, ctx, ctx);

  if (opts.dryRun) {
    await renderProjectDry(fullCtx);
  } else {
    const outDir = await renderProject(fullCtx);
    await history.saveSession(fullCtx);
    done(outDir, fullCtx);
    await writePashaJson(outDir, fullCtx);
  }
}

async function createInteractive(opts) {
  welcome();

  let manifest;
  try { manifest = await loadManifest(); }
  catch (err) {
    log.fail(`Failed to load template manifest: ${err.message}`);
    process.exit(1);
  }
  _manifest = manifest;

  let initialCtx = {};

  if (opts.preset) {
    try {
      const presetAnswers = await loadPreset(opts.preset);
      initialCtx = Object.assign({}, presetAnswers);
      log.info(`Loaded preset: ${path.basename(opts.preset)}`);
    } catch (err) {
      log.fail(`Failed to load preset: ${err.message}`);
      process.exit(1);
    }
  }

  if (opts.resume) {
    try {
      let session = null;
      if (typeof opts.resume === 'string' && opts.resume !== 'true') {
        session = await history.loadSession(opts.resume);
        if (!session) {
          log.warn(`Session "${opts.resume}" not found.`);
        }
      } else {
        session = await history.lastSession();
        if (session) {
          log.info(`Resuming last session: ${session.projectName} (${session.framework})`);
        }
      }
      if (session) {
        const sessionAnswers = history.sessionToAnswers(session);
        initialCtx = Object.assign({}, sessionAnswers, initialCtx);
      } else {
        log.info('No previous sessions found. Starting fresh.');
      }
    } catch (err) {
      log.warn(`Could not resume session: ${err.message}`);
    }
  }

  const { mode } = await prompt([{
    type: 'list', name: 'mode', message: 'What would you like to build?',
    choices: [
      { name: chalk.bold('Single service'), value: 'single', description: 'One backend service with your chosen stack' },
      { name: chalk.cyan('Microservices (multi-service)'), value: 'multi', description: 'Multiple independent services orchestrated together' },
    ],
  }]);

  if (mode === 'multi') {
    section('Project Info');
    const base = await prompt([
      {
        type: 'input', name: 'projectName', message: 'Root project name?',
        default: initialCtx.projectName || undefined,
        validate: (v) => {
          if (!v || v.trim() === '') return 'Project name cannot be empty';
          return /^[a-z0-9-]+$/.test(v) || 'Lowercase letters, numbers, and hyphens only';
        },
      },
      {
        type: 'input', name: 'author', message: 'Your full name?',
        default: initialCtx.author || undefined,
        validate: (v) => {
          if (!v || v.trim().length === 0) return 'Please enter your name';
          return true;
        },
      },
      {
        type: 'input', name: 'github', message: 'GitHub username?',
        default: initialCtx.github || undefined,
        validate: (v) => {
          if (!v || v.trim() === '') return 'GitHub username cannot be empty';
          return /^[a-zA-Z0-9-]+$/.test(v) || 'Letters, numbers, and hyphens only';
        },
      },
      {
        type: 'input', name: 'description', message: 'Short description?',
        default: initialCtx.description || 'Built with pasha CLI',
      },
    ]);
    await runMicroservices(Object.assign({}, base));
    return;
  }

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
  const ctx = await nav.start(initialCtx);

  if (!ctx._confirmed) {
    log.warn('Aborted.');
    process.exit(0);
  }

  if (opts.savePreset) {
    try {
      const savedPath = await savePreset(opts.savePreset, ctx);
      log.info(`Preset saved: ${opts.savePreset}`);
    } catch (err) {
      log.fail(`Failed to save preset: ${err.message}`);
    }
  }

  if (opts.dryRun) {
    await renderProjectDry(ctx);
  } else {
    const outDir = await renderProject(ctx);
    await history.saveSession(ctx);
    done(outDir, ctx);
    await writePashaJson(outDir, ctx);
  }
}

async function create(options = {}) {
  try {
    if (options.yes) {
      return createNonInteractive(options);
    }
    if (hasEnoughCliFlags(options)) {
      return createNonInteractive(options);
    }
    return createInteractive(options);
  } catch (err) {
    if (err && err.name === 'ExitPromptError') {
      console.log('');
      log.warn('Cancelled.');
      process.exit(0);
    }
    throw err;
  }
}

module.exports = { create };
