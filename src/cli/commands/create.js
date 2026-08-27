'use strict';
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const os = require('os');

const log = require('../../utils/logger');
const { run } = require('../../core/system/exec');
const { loadManifest, getLanguages, getFrameworks, getArchitectures, getTemplateDir } = require('../../core/catalog/manifest');
const { loadTemplateConfig } = require('../../core/catalog/template-config');
const { renderTemplateDir, renderModuleFiles, countFilesInTemplateDir } = require('../../core/engine/renderer');
const { makeIncludeCheck } = require('../../core/engine/conditions');
const { checkAll, installTool, resolveCommandPath } = require('../../core/system/prerequisites');
const { resolveFeatures } = require('../../core/features/index');
const { Navigator } = require('../../core/wizard/navigator');
const { prompt, setTuiMode, setTuiApp, setTuiContext, isTuiMode } = require('../../ui/prompts');
const { welcome } = require('../../ui/screens/welcome');
const { summary } = require('../../ui/screens/summary');
const { done } = require('../../ui/screens/done');
const { error, section, divider } = require('../../ui/screens/error');
const { Spinner } = require('../../ui/screens/progress');
const history = require('../../core/session/history');
const { loadPreset, savePreset } = require('../../core/session/presets');
const io = require('../../ui/io');

let _inkApp = null;
let _inkInstance = null;
let _tuiTerminal = null;

const TEMPLATES_ROOT = path.join(__dirname, '../../../templates');

const FRONTEND_FLAVORS = ['nextjs', 'react', 'vue', 'svelte', 'angular', 'astro', 'html'];

// Same patterns enforced by the interactive prompts (stepProject's
// projectName/github validators and askModules' moduleName validator).
// The non-interactive (`-y` / flag-driven) path reads these values straight
// from flags and skips those prompts entirely, so it must apply the same
// checks itself before the values reach any output path or template render.
const PROJECT_NAME_RE = /^[a-z0-9-]+$/;
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9-]+$/;
const MODULE_NAME_RE = /^[a-z][a-z0-9-]*$/;

let _manifest = null;

function progressHeader(current, total, label) {
  if (isTuiMode()) return;
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
  if (shouldInstall === '__back__') return '__back__';
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

// ---- Stack sub-navigator ----
//
// The Stack step is a composite of 6-7 sub-prompts (ORM, database, validation,
// Redis, broker, AGENT docs, extras).  It uses its own internal step index so
// that "back" means "go to the previous sub-prompt", not "abort the entire
// Stack step and return to Project Info".
//
// Only back from the very first select sub-prompt (ORM, when multiple choices
// exist) propagates upwards as '__back__' to the outer wizard navigator.
//
// Extras is a checkbox — a navigation sentinel must never be a selectable
// value in a multi-select, so the extras prompt does NOT offer a back choice.
// Instead the message shows "(space to toggle, enter to submit)".

function _buildStackSteps(fm, ctx, nav) {
  const isFrontend = FRONTEND_FLAVORS.includes(ctx._stackFlavor);
  const steps = [];

  if (!isFrontend) {
    // 0: ORM (single-select or auto)
    const ormChoices = fm.ormChoices(ctx.framework);
    if (ormChoices.length > 1) {
      steps.push({
        name: 'orm',
        label: 'ORM',
        run: async (c) => {
          const a = await prompt([{
            type: 'list', name: 'orm', message: 'Data layer / ORM?',
            choices: withBack(ormChoices, nav),
            default: c.orm || undefined,
          }]);
          if (a.orm === '__back__') return '__back__';
          return { orm: a.orm };
        },
      });
    } else if (ormChoices.length === 1) {
      steps.push({
        name: 'orm',
        label: 'ORM',
        run: async () => {
          const val = ormChoices[0].value;
          log.info(`   ORM: ${ormChoices[0].name} (the only option for ${ctx.framework})`);
          return { orm: val };
        },
      });
    } else {
      steps.push({
        name: 'orm',
        label: 'ORM',
        run: async () => ({ orm: 'none' }),
      });
    }

    // 1: Database (single-select or auto)
    steps.push({
      name: 'database',
      label: 'Database',
      run: async (c) => {
        const orm = c.orm;
        if (!orm || orm === 'none') return { database: 'none' };
        const dbChoices = fm.databaseChoices(orm);
        if (dbChoices.length === 0) return { database: 'none' };
        if (dbChoices.length === 1) {
          log.info(`   Database: ${dbChoices[0].name} (the only option ${orm} supports)`);
          return { database: dbChoices[0].value };
        }
        const a = await prompt([{
          type: 'list', name: 'database', message: 'Database?',
          choices: withBack(dbChoices, nav),
          default: (c.database && c.database !== 'none') ? c.database : undefined,
        }]);
        if (a.database === '__back__') return '__back__';
        return { database: a.database };
      },
    });

    // 2: Redis (confirm — no back)
    steps.push({
      name: 'redis',
      label: 'Redis',
      run: async (c) => {
        const a = await prompt([{
          type: 'confirm', name: 'useRedis', message: 'Add Redis for caching?',
          default: c.useRedis !== undefined ? Boolean(c.useRedis) : false,
        }]);
        if (a.useRedis === '__back__') return '__back__';
        return { useRedis: a.useRedis };
      },
    });

    // 3: Broker (single-select or auto)
    const brokerChoices = fm.brokerChoices();
    if (brokerChoices.length > 1) {
      steps.push({
        name: 'broker',
        label: 'Broker',
        run: async (c) => {
          const a = await prompt([{
            type: 'list', name: 'broker', message: 'Message broker?',
            choices: withBack(brokerChoices, nav),
            default: c.broker || undefined,
          }]);
          if (a.broker === '__back__') return '__back__';
          return { broker: a.broker };
        },
      });
    } else {
      steps.push({
        name: 'broker',
        label: 'Broker',
        run: async () => ({ broker: 'none' }),
      });
    }
  }

  // Validation (single-select — always asked, even for frontend)
  steps.push({
    name: 'validation',
    label: 'Validation',
    run: async (c) => {
      const a = await prompt([{
        type: 'list', name: 'validation', message: 'Validation & transformation?',
        choices: withBack(fm.validationChoices(), nav),
        default: c.validation || undefined,
      }]);
      if (a.validation === '__back__') return '__back__';
      return { validation: a.validation };
    },
  });

  // AGENT docs (confirm — no back, always asked)
    steps.push({
      name: 'agentdocs',
      label: 'AGENT Docs',
      run: async (c) => {
        const a = await prompt([{
          type: 'confirm', name: 'useAgentDocs',
          message: 'Generate AGENT.md files for AI-assisted development?',
          default: c.useAgentDocs !== undefined ? c.useAgentDocs : true,
        }]);
        if (a.useAgentDocs === '__back__') return '__back__';
        return { useAgentDocs: a.useAgentDocs };
      },
    });

  // Extras (checkbox — no back choice)
  if (fm.extraFeatureChoices) {
    steps.push({
      name: 'extras',
      label: 'Extras',
      run: async (c) => {
        const choices = fm.extraFeatureChoices().map(ch => ({
          name: ch.name,
          value: ch.value,
          checked: c.extras ? c.extras.includes(ch.value) : ch.checked,
        }));
        const a = await prompt([{
          type: 'checkbox', name: 'extras',
          message: 'Additional features (space to toggle, enter to submit)?',
          choices,
        }]);
        return { extras: a.extras };
      },
    });
  }

  return steps;
}

async function runStackWizard(ctx, nav) {
  const tf = ctx._templateConfig;
  const flavor = tf.stackFeatures;
  if (!flavor) return {};

  const isFrontend = FRONTEND_FLAVORS.includes(flavor);
  const fm = resolveFeatures(flavor);
  const steps = _buildStackSteps(fm, ctx, nav);

  section('Stack Configuration');

  let index = 0;
  const total = steps.length;
  const answers = isFrontend
    ? {
        orm: 'none',
        database: 'none',
        validation: ctx.validation || undefined,
        useRedis: false,
        broker: 'none',
        useAgentDocs: ctx.useAgentDocs,
        extras: ctx.extras || undefined,
      }
    : {
        orm: ctx.orm || undefined,
        database: ctx.database || undefined,
        validation: ctx.validation || undefined,
        useRedis: ctx.useRedis,
        broker: ctx.broker || undefined,
        useAgentDocs: ctx.useAgentDocs,
        extras: ctx.extras || undefined,
      };

  while (index >= 0 && index < total) {
    const step = steps[index];

    try {
      const result = await step.run(answers);

      if (result === '__back__') {
        if (index === 0) return '__back__';
        index--;
        continue;
      }

      if (result && typeof result === 'object' && !Array.isArray(result)) {
        Object.assign(answers, result);
      }

      index++;
    } catch (err) {
      if (err.name === 'ExitPromptError') throw err;
      log.fail(`Stack step "${step.label}" failed: ${err.message}`);
      index++;
    }
  }

  return {
    orm: answers.orm,
    database: answers.database || 'none',
    validation: answers.validation,
    useRedis: answers.useRedis,
    broker: answers.broker || 'none',
    useAgentDocs: answers.useAgentDocs,
    extras: answers.extras || [],
  };
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

  const fullCtx = Object.assign({}, baseAnswers, ctx, flags, {
    modules,
    dbName: String(baseAnswers.projectName).replace(/-/g, '_').toLowerCase(),
  });

  if (flavor) {
    const fm = resolveFeatures(flavor);

    if (FRONTEND_FLAVORS.includes(flavor)) {
      flags._frontendFlavor = flavor;
      const deps = fm.resolveDependencies(flags);
      fullCtx.dependenciesJson = JSON.stringify(deps.dependencies, null, 4).replace(/\n/g, '\n  ');
      fullCtx.devDependenciesJson = JSON.stringify(deps.devDependencies, null, 4).replace(/\n/g, '\n  ');
      fullCtx.scriptsJson = JSON.stringify(fm.resolveScripts(flags), null, 4).replace(/\n/g, '\n  ');
    } else if (flavor === 'go' || flavor === 'chi' || flavor === 'go-stdlib') {
      const deps = fm.resolveDependencies(flags);
      fullCtx.goModules = deps.goModules;
    } else if (flavor === 'python' || flavor === 'flask' || flavor === 'litestar' || flavor === 'tornado') {
      const deps = fm.resolveDependencies(flags);
      fullCtx.requirementsTxt = deps.requirements.join('\n') + '\n';
      if (deps.devRequirements && deps.devRequirements.length > 0)
        fullCtx.devRequirementsTxt = deps.devRequirements.join('\n') + '\n';
    } else if (flavor === 'laravel') {
      const deps = fm.resolveDependencies(flags);
      fullCtx.composerRequire = deps.composerRequire;
      fullCtx.composerRequireDev = deps.composerRequireDev;
    } else {
      const deps = fm.resolveDependencies(flags);
      if (deps.cargoDeps) {
        fullCtx.cargoDeps = deps.cargoDeps;
      } else if (deps.dependencies) {
        if (Array.isArray(deps.dependencies)) {
          fullCtx.dependenciesXml = deps.dependencies.join('\n');
          if (deps.devDependencies && deps.devDependencies.length)
            fullCtx.devDependenciesXml = deps.devDependencies.join('\n');
          if (deps.plugins && deps.plugins.length)
            fullCtx.pluginsXml = deps.plugins.join('\n');
        } else {
          fullCtx.dependenciesJson = JSON.stringify(deps.dependencies, null, 4).replace(/\n/g, '\n  ');
          fullCtx.devDependenciesJson = JSON.stringify(deps.devDependencies, null, 4).replace(/\n/g, '\n  ');
        }
      }
      fullCtx.scriptsJson = JSON.stringify(fm.resolveScripts(flags), null, 4).replace(/\n/g, '\n  ');
      if (flags.useTests && fm.resolveJestConfig)
        fullCtx.jestConfigJson = JSON.stringify(fm.resolveJestConfig(), null, 4).replace(/\n/g, '\n  ');
    }
  }

  return fullCtx;
}

async function renderProject(ctx, renderOpts = {}) {
  const outDir = path.resolve(process.cwd(), ctx.projectName);
  if (await fs.pathExists(outDir)) {
    log.fail(`Directory "${ctx.projectName}" already exists.`);
    process.exit(1);
  }

  const tc = ctx._templateConfig;
  const templateDir = path.join(TEMPLATES_ROOT, ctx._templateName);
  const shouldInclude = makeIncludeCheck(tc.fileConditions, ctx);
  const modules = ctx.modules || [];

  const tui = isTuiMode();
  const isPlain = io.isPlainMode();
  const onProgress = renderOpts.onProgress || null;
  const silentSpinner = { start() { return this; }, succeed() { return this; }, fail() { return this; }, stop() {}, warn() { return this; } };
  let sp;
  if (tui) {
    sp = silentSpinner;
  } else if (isPlain) {
    console.log('  … Generating files...');
    sp = silentSpinner;
  } else {
    sp = new Spinner('Generating files...').start();
  }
  try {
    await fs.ensureDir(outDir);

    if (tui && onProgress) onProgress({ phase: 0, filePath: null, fileCount: 0 });

    if (tc.shared) {
      const sharedFiles = path.join(TEMPLATES_ROOT, tc.shared, 'files');
      if (await fs.pathExists(sharedFiles))
        await renderTemplateDir(sharedFiles, outDir, ctx, shouldInclude, null, onProgress ? function (fp) { onProgress({ phase: 0, filePath: fp }); } : null);
    }

    await renderTemplateDir(path.join(templateDir, 'files'), outDir, ctx, shouldInclude, null, onProgress ? function (fp) { onProgress({ phase: 0, filePath: fp }); } : null);

    const moduleFilesDir = path.join(templateDir, 'moduleFiles');
    if (modules.length && (await fs.pathExists(moduleFilesDir)))
      await renderModuleFiles(moduleFilesDir, outDir, ctx, modules, shouldInclude, onProgress ? function (fp) { onProgress({ phase: 0, filePath: fp }); } : null);

    if (tui && onProgress) onProgress({ phase: 0, done: true });
    if (isPlain) {
      console.log(`  ✓ Files generated (${modules.length} module${modules.length === 1 ? '' : 's'})`);
    } else if (!tui) {
      sp.succeed(chalk.green(`Files generated (${modules.length} module${modules.length === 1 ? '' : 's'})`));
    }
  } catch (err) {
    if (isPlain) {
      console.log(`  ✗ ${err.message}`);
    } else if (!tui) {
      sp.fail(chalk.red(err.message));
    }
    process.exit(1);
  }

  if (!renderOpts.skipInstall && tc.postInstall && tc.postInstall.includes('npm install')) {
    if (!tui) section('Installing dependencies');
    if (tui && onProgress) onProgress({ phase: 1, filePath: null, fileCount: 0 });
    const npmPath = resolveCommandPath('npm');
    if (!npmPath) {
      log.fail('Could not resolve npm on PATH.');
      log.warn(`Run manually: cd ${ctx.projectName} && npm install`);
    } else {
      try {
        await run(npmPath, ['install'], { cwd: outDir, stdio: 'inherit' });
        if (tui && onProgress) onProgress({ phase: 1, done: true });
        log.ok('npm install done');
      } catch (err) {
        log.fail(err.message);
        log.warn(`Run manually: cd ${ctx.projectName} && npm install`);
      }
    }
  }

  if (!renderOpts.skipGit && tc.gitInit) {
    if (tui && onProgress) {
      onProgress({ phase: 3, filePath: null, fileCount: 0 });
      try {
        await run('git', ['init'], { cwd: outDir, stdio: 'ignore' });
        await run('git', ['add', '.'], { cwd: outDir, stdio: 'ignore' });
        await run('git', ['commit', '-m', 'feat: init ' + ctx.projectName], { cwd: outDir, stdio: 'ignore' });
      } catch (_) {}
      onProgress({ phase: 3, done: true });
    } else {
      const { doGit } = await prompt([
        { type: 'confirm', name: 'doGit', message: 'Run git init and first commit?', default: true },
      ]);
      if (doGit) {
        if (isPlain) console.log('  … Setting up git...');
        const sg = (tui || isPlain) ? silentSpinner : new Spinner('Setting up git...').start();
        try {
          await run('git', ['init'], { cwd: outDir, stdio: 'ignore' });
          await run('git', ['add', '.'], { cwd: outDir, stdio: 'ignore' });
          await run('git', ['commit', '-m', 'feat: init ' + ctx.projectName], { cwd: outDir, stdio: 'ignore' });
          if (isPlain) {
            console.log('  ✓ git set up');
          } else if (!tui) {
            sg.succeed(chalk.green('git set up'));
          }
        } catch {
          if (isPlain) {
            console.log('  Run git init manually');
          } else if (!tui) {
            sg.warn('Run git init manually');
          }
        }
      }
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
  if (ctx._mode === 'frontend') {
    log.info('   Language: Frontend (auto-selected)');
    return { language: 'frontend', languageLabel: 'Frontend' };
  }
  const langs = getLanguages(_manifest);
  const defaultVal = ctx.language || undefined;
  const { language } = await prompt([{
    type: 'list', name: 'language', message: 'Pick a language:',
    choices: withBack(langs, nav),
    default: defaultVal,
  }]);
  if (language === '__back__') return '__back__';
  var labelChoice = langs.find(function (l) { return l.value === language; });
  return { language, languageLabel: (labelChoice && labelChoice.name) || language };
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
  var fwChoice = fws.find(function (f) { return f.value === framework; });
  return { framework, frameworkLabel: (fwChoice && fwChoice.name) || framework };
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
  const res = await ensurePrerequisites(ctx._templateConfig.prerequisites);
  if (res === '__back__') return '__back__';
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
  for (const v of Object.values(answers)) {
    if (v === '__back__') return '__back__';
  }
  return answers;
}

async function stepStack(ctx, nav) {
  progressHeader(nav.currentIndex + 1, nav.totalSteps, nav.currentStep.label);
  return runStackWizard(ctx, nav);
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
  const flags = flavor ? resolveFeatures(flavor).deriveFlags(Object.assign(
    {},
    ctx.orm ? { orm: ctx.orm, database: ctx.database, validation: ctx.validation,
      broker: ctx.broker, useRedis: ctx.useRedis, useAgentDocs: ctx.useAgentDocs,
      extras: ctx.extras } : {}
  )) : {};

  const fullCtx = buildContext(flags, ctx.modules || [], ctx, ctx);

  if (ctx._mode !== 'multi') {
    if (isTuiMode()) {
      const tuiApp = require('../../ui/tui/app');
      var action = await new Promise(function (resolve) {
        tuiApp.showSummary(fullCtx, {
          onGenerate: function () { resolve('__confirm__'); },
          onBack: function () { resolve('__back__'); },
        });
      });
    } else {
      summary(fullCtx);
    }
  }

  if (action === undefined) {
    var response = await prompt([{
      type: 'list', name: 'action', message: 'Ready to scaffold?',
      choices: [
        { name: chalk.green('✓ Generate project'), value: '__confirm__', description: 'Create the project directory with all generated files' },
        { name: chalk.dim('← Go back and change something'), value: '__back__', description: 'Return to previous steps to adjust your choices' },
        { name: chalk.red('✗ Cancel'), value: '__cancel__', description: 'Exit without creating any files' },
      ],
    }]);
    var action = response.action;
  }

  if (action === '__cancel__') {
    log.warn('Aborted. No files were created.');
    return '__cancel__';
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
    const flags = flavor ? resolveFeatures(flavor).deriveFlags(Object.assign(
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
  if (opts.mode === 'frontend') return !!(opts.framework && opts.architecture);
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
  const isFrontendMode = opts.mode === 'frontend';

  const lang = isFrontendMode ? 'frontend' : (opts.language || 'node');
  const fw = isFrontendMode ? (opts.framework || 'react') : (opts.framework || 'nestjs');
  const arch = isFrontendMode ? (opts.architecture || 'component-based') : (opts.architecture || 'layered');

  const ti = await resolveTemplateInfo(lang, fw, arch);
  const flavor = ti._stackFlavor;

  let orm, database, validation, useRedis, broker, useAgentDocs, extras, flags, stackAnswers;
  let isFrontendNonInteractive = false;

  if (flavor) {
    const isFrontend = FRONTEND_FLAVORS.includes(flavor);
    isFrontendNonInteractive = isFrontend;
    const fm = resolveFeatures(flavor);

    if (isFrontend) {
      orm = 'none';
      database = 'none';
      useRedis = false;
      broker = 'none';
      validation = opts.validation || (fm.validationChoices()[0] && fm.validationChoices()[0].value) || 'none';
      useAgentDocs = opts.agentDocs !== undefined ? Boolean(opts.agentDocs) : true;
      extras = opts.extras ? opts.extras.split(',').map((s) => s.trim()).filter(Boolean) : ['lint', 'tests'];
    } else {
      orm = opts.orm || (fm.ormChoices(fw)[0] && fm.ormChoices(fw)[0].value) || 'none';
      database = opts.database || 'none';
      if (orm !== 'none' && database === 'none') {
        const dbChoices = fm.databaseChoices(orm);
        if (dbChoices.length > 0) database = dbChoices[0].value;
      }
      validation = opts.validation || (fm.validationChoices()[0] && fm.validationChoices()[0].value) || 'none';
      useRedis = opts.redis !== undefined ? Boolean(opts.redis) : false;
      broker = opts.broker || 'none';
      useAgentDocs = opts.agentDocs !== undefined ? Boolean(opts.agentDocs) : true;
      extras = opts.extras ? opts.extras.split(',').map((s) => s.trim()).filter(Boolean) : ['swagger', 'lint', 'tests', 'health'];
    }

    stackAnswers = { orm, database, validation, useRedis, broker, useAgentDocs, extras };
    if (isFrontendNonInteractive) stackAnswers._frontendFlavor = flavor;
    flags = fm.deriveFlags(stackAnswers);
  } else {
    orm = 'none';
    database = 'none';
    validation = 'none';
    useRedis = false;
    broker = 'none';
    useAgentDocs = true;
    extras = [];
    flags = {};
    stackAnswers = { orm, database, validation, useRedis, broker, useAgentDocs, extras };
  }

  const modules = opts.modules ? opts.modules.split(',').map((s) => s.trim()).filter(Boolean) : ['product'];
  const projectName = opts.projectName || 'my-project';
  const author = opts.author || process.env.USER || process.env.USERNAME || 'Developer';
  const github = opts.github || 'developer';
  const description = opts.description || 'Built with pasha CLI';

  if (!PROJECT_NAME_RE.test(projectName)) {
    log.fail(`Invalid project name "${projectName}". Use only lowercase letters, numbers, and hyphens (e.g. my-api).`);
    process.exit(1);
  }
  if (!author || !String(author).trim()) {
    log.fail('Author name cannot be empty.');
    process.exit(1);
  }
  if (!GITHUB_USERNAME_RE.test(github)) {
    log.fail(`Invalid GitHub username "${github}". Use only letters, numbers, and hyphens (e.g. johndoe).`);
    process.exit(1);
  }
  for (const m of modules) {
    if (!MODULE_NAME_RE.test(m)) {
      log.fail(`Invalid module name "${m}". Start with a lowercase letter; use lowercase letters, numbers, and hyphens only.`);
      process.exit(1);
    }
  }

  const ctx = Object.assign(
    {
      language: lang,
      framework: fw,
      architecture: arch,
      projectName,
      author,
      github,
      description,
      _mode: isFrontendMode ? 'frontend' : 'single',
    },
    ti,
    stackAnswers
  );

  const fullCtx = buildContext(flags, modules, ctx, ctx);

  if (opts.dryRun) {
    await renderProjectDry(fullCtx);
  } else {
    const outDir = await renderProject(fullCtx, { skipInstall: opts.skipInstall, skipGit: opts.skipGit });
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
      { name: chalk.magenta('Frontend app'), value: 'frontend', description: 'React, Vue, Next.js, Svelte, or static HTML site' },
    ],
  }]);

  if (mode === 'frontend') {
    initialCtx._mode = 'frontend';
    initialCtx.language = 'frontend';
  }

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

async function createTui(options) {
  const tuiTerminal = require('../../ui/tui/terminal');
  const { initInk, getInk } = require('../../ui/tui/ink-proxy');
  const { disableAnimation } = require('../../ui/tui/hooks/useAnimation');

  if (options.animation === false) {
    disableAnimation();
  }

  if (options.tuiForce) {
    tuiTerminal.setForceMode(true);
    require('../../ui/tui/hooks/useAnimation').setForceMode(true);
  }

  if (!io.canUseTui(options)) {
    log.warn('TUI mode unavailable. Falling back to sequential prompts.');
    return await create(Object.assign({}, options, { tui: false }));
  }

  _tuiTerminal = tuiTerminal;

  let _cleanupExitHandlers = null;
  try {
    tuiTerminal.setup();
    await initInk();
    const ink = getInk();

    const tuiApp = require('../../ui/tui/app');
    const { showProgress, showSummary, showDone, updateProgress, getState } = tuiApp;

    const React = require('react');
    const { waitUntilExit, rerender } = ink.render(
      React.createElement(tuiApp.App),
      { stdin: process.stdin, stdout: process.stdout, exitOnCtrlC: false }
    );

    setTuiMode(true);
    setTuiApp(tuiApp);

    const _log = console.log;
    const _error = console.error;
    console.log = function () {};
    console.error = function () {
      _error.apply(console, arguments);
    };

    _cleanupExitHandlers = tuiTerminal.registerExitHandlers(() => {
      tuiTerminal.restore();
    });
    let manifest;
    try { manifest = await loadManifest(); }
    catch (err) {
      log.fail(`Failed to load template manifest: ${err.message}`);
      tuiTerminal.restore();
      process.exit(1);
    }
    _manifest = manifest;

    let initialCtx = {};

    if (options.preset) {
      try {
        const presetAnswers = await loadPreset(options.preset);
        initialCtx = Object.assign({}, presetAnswers);
        log.info(`Loaded preset: ${path.basename(options.preset)}`);
      } catch (err) {
        log.fail(`Failed to load preset: ${err.message}`);
        tuiTerminal.restore();
        process.exit(1);
      }
    }

    if (options.resume) {
      try {
        let session = null;
        if (typeof options.resume === 'string' && options.resume !== 'true') {
          session = await history.loadSession(options.resume);
          if (!session) log.warn(`Session "${options.resume}" not found.`);
        } else {
          session = await history.lastSession();
          if (session) log.info(`Resuming last session: ${session.projectName} (${session.framework})`);
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

    const steps = [
      { name: 'mode',         label: 'Mode',            run: _stepMode },
      { name: 'language',     label: 'Language',       run: stepLanguage },
      { name: 'framework',    label: 'Framework',       run: stepFramework },
      { name: 'architecture', label: 'Architecture',    run: stepArchitecture },
      { name: 'prereqs',      label: 'Prerequisites',   run: _stepPrerequisites },
      { name: 'project',      label: 'Project Info',    run: stepProject },
      { name: 'stack',        label: 'Stack',           run: stepStack },
      { name: 'modules',      label: 'Modules',         run: stepModules },
      { name: 'review',       label: 'Review',          run: stepReview },
    ];

    async function _stepMode(ctx, nav) {
      const { mode } = await prompt([{
        type: 'list', name: 'mode', message: 'What would you like to build?',
        choices: [
          { name: 'Single service', value: 'single', description: 'One backend service with your chosen stack' },
          { name: 'Microservices (multi-service)', value: 'multi', description: 'Multiple independent services orchestrated together' },
          { name: 'Frontend app', value: 'frontend', description: 'React, Vue, Next.js, Svelte, or static HTML site' },
        ],
      }]);
      if (mode === '__back__') return '__back__';
      return { _mode: mode, mode };
    }

    async function _stepPrerequisites(ctx, nav) {
      const tc = ctx._templateConfig;
      if (!tc || !tc.prerequisites || !tc.prerequisites.length) return {};
      const tools = tc.prerequisites;
      const results = checkAll(tools);

      const tuiApp = require('../../ui/tui/app');

      return new Promise((resolve) => {
        const installToolQuiet = (tool) => installTool(tool, { stdio: 'ignore' });
        tuiApp.showPrereqsScreen(results, installToolQuiet, (allOk) => {
          if (!allOk) {
            log.warn('Some prerequisites were not installed. The generated project may not run.');
          }
          resolve({});
        });
      });
    }

    const nav = new Navigator(steps);
    tuiApp.setNavigator(nav);

    // Wrap each step to update TUI context and pass accumulated answers
    for (let i = 0; i < steps.length; i++) {
      const originalRun = steps[i].run;
      const stepIdx = i;
      steps[i].run = async (ctx, navigator) => {
        setTuiContext({
          stepIndex: stepIdx,
          totalSteps: steps.length,
          stepLabel: steps[stepIdx].label,
          answers: ctx,
        });
        return originalRun(ctx, navigator);
      };
    }

    setTuiContext({
      stepIndex: 0,
      totalSteps: steps.length,
      stepLabel: steps[0].label,
      answers: initialCtx,
    });

    const ctx = await nav.start(initialCtx);

    if (!ctx._confirmed) {
      showDone('Cancelled. No files were created.', null, null);
      await waitUntilExit();
      tuiTerminal.restore();
      process.stdout.write('Cancelled. No files were created.\n');
      process.exit(0);
    }

    if (options.savePreset) {
      try {
        const savedPath = await savePreset(options.savePreset, ctx);
        log.info(`Preset saved: ${options.savePreset}`);
      } catch (err) {
        log.fail(`Failed to save preset: ${err.message}`);
      }
    }

    const phases = [
      { label: 'Rendering templates' },
      { label: 'Installing dependencies' },
      { label: 'Writing config' },
      { label: 'Initializing git' },
    ];

    var renderFileCount = 0;
    var renderFileDone = 0;

    function makeProgressCallback(phase, totalFiles) {
      return function (evt) {
        if (evt.done) {
          var cs = getState();
          var prev = (cs && cs.completedPhases) ? cs.completedPhases : {};
          var updated = Object.assign({}, prev);
          var targetPhase = evt.phase !== undefined ? evt.phase : phase;
          updated[targetPhase] = true;
          updateProgress({ completedPhases: updated, currentPhase: Math.max(targetPhase + 1, 0) });
          return;
        }
        if (evt.filePath) {
          renderFileDone++;
          updateProgress({
            filePath: evt.filePath,
            fileCount: renderFileDone,
            fileTotal: totalFiles,
          });
        }
        if (evt.phase !== undefined && evt.phase !== phase && !evt.filePath) {
          updateProgress({ currentPhase: evt.phase });
        }
      };
    }

    if (options.dryRun) {
      showProgress(phases, 0, 'Generating file list...');
      await renderProjectDry(ctx);
    } else {
      // Pre-count files for progress bar
      var tc = ctx._templateConfig;
      var templateDir = path.join(TEMPLATES_ROOT, ctx._templateName);
      var shouldInclude = makeIncludeCheck(tc.fileConditions, ctx);

      renderFileCount = await countFilesInTemplateDir(path.join(templateDir, 'files'), shouldInclude);
      if (tc.shared) {
        var sharedFilesDir = path.join(TEMPLATES_ROOT, tc.shared, 'files');
        if (await fs.pathExists(sharedFilesDir)) {
          renderFileCount += await countFilesInTemplateDir(sharedFilesDir, shouldInclude);
        }
      }
      var moduleFilesDir = path.join(templateDir, 'moduleFiles');
      if ((ctx.modules || []).length && (await fs.pathExists(moduleFilesDir))) {
        for (var _m of ctx.modules || []) {
          renderFileCount += await countFilesInTemplateDir(moduleFilesDir, shouldInclude);
        }
      }

      showProgress(phases, 0, 'Rendering templates...');
      var onProgress = makeProgressCallback(0, renderFileCount);
      var outDir = await renderProject(ctx, { onProgress });
      await history.saveSession(ctx);
      updateProgress({ currentPhase: 2 });
      await writePashaJson(outDir, ctx);
      var cs2 = getState();
      var prev2 = (cs2 && cs2.completedPhases) ? cs2.completedPhases : {};
      var updated2 = Object.assign({}, prev2);
      updated2[2] = true;
      updateProgress({ completedPhases: updated2, currentPhase: -1 });

      showDone(`Project "${ctx.projectName}" created!`, outDir, ctx);
    }

    await waitUntilExit();
    var summary = tuiTerminal.getSummary();
    tuiTerminal.restore();
    if (summary && summary.outPath) {
      done(summary.outPath, summary.ctx);
    }
    process.exit(0);
  } catch (err) {
    if (err && err.name === 'ExitPromptError') {
      showDone('Cancelled.', null, null);
    } else {
      showDone('Failed: ' + (err.message || 'Unknown error'), null, null);
    }
    await waitUntilExit();
    tuiTerminal.restore();
    process.exit(err && err.name === 'ExitPromptError' ? 0 : 1);
  } finally {
    if (_cleanupExitHandlers) _cleanupExitHandlers();
    if (_log) console.log = _log;
    if (_error) console.error = _error;
    setTuiMode(false);
    tuiTerminal.reset();
  }
}

async function create(options = {}) {
  try {
    if (options.plain && !io.isPlainMode()) {
      io.setPlainMode(true);
      try { require('chalk').level = 0; } catch (_e) {}
    }
    if (options.yes) {
      return createNonInteractive(options);
    }
    if (hasEnoughCliFlags(options)) {
      return createNonInteractive(options);
    }
    if (!options.plain && io.canUseTui(options)) {
      return createTui(options);
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
