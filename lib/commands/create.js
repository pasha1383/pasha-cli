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

const TEMPLATES_ROOT = path.join(__dirname, '../../templates');

async function ensurePrerequisites(tools) {
  if (!tools || !tools.length) return;
  log.title('🩺 Checking prerequisites...');
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

/**
 * Walks the stack questions. Each answer narrows the next question, so the
 * user is never offered a combination that cannot actually work (Mongoose
 * with PostgreSQL, a database question when they picked no ORM, and so on).
 */
async function askStackFeatures() {
  log.title('🧰 Stack');

  const { orm } = await inquirer.prompt([{
    type: 'list',
    name: 'orm',
    message: '🗄️  Which data layer / ORM?',
    choices: features.ormChoices(),
  }]);

  let database = 'none';
  if (orm !== 'none') {
    const choices = features.databaseChoices(orm);
    if (choices.length === 1) {
      database = choices[0].value;
      log.info(`   Database: ${choices[0].name} (the only option ${orm} supports)`);
    } else {
      const answer = await inquirer.prompt([{
        type: 'list',
        name: 'database',
        message: '💾 Which database?',
        choices,
      }]);
      database = answer.database;
    }
  }

  const { validation } = await inquirer.prompt([{
    type: 'list',
    name: 'validation',
    message: '✅ Validation & transformation?',
    choices: features.validationChoices(),
  }]);

  const { useRedis } = await inquirer.prompt([{
    type: 'confirm',
    name: 'useRedis',
    message: '⚡ Add Redis for caching?',
    default: false,
  }]);

  const { broker } = await inquirer.prompt([{
    type: 'list',
    name: 'broker',
    message: '📨 Message broker?',
    choices: features.brokerChoices(),
  }]);

  const { useAgentDocs } = await inquirer.prompt([{
    type: 'confirm',
    name: 'useAgentDocs',
    message: '🤖 Generate AGENT.md files for AI-assisted development?',
    default: true,
  }]);

  return { orm, database, validation, useRedis, broker, useAgentDocs };
}

async function askModules(templateConfig) {
  if (!templateConfig.modules || !templateConfig.modules.enabled) return [];

  log.title('🧱 Modules');
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

function printNextSteps(ctx) {
  console.log(chalk.bold('\n📋 Next steps'));
  console.log(chalk.gray(`  cd ${ctx.projectName}`));
  if (ctx.useDocker) {
    console.log(chalk.gray('  cp .env.example .env'));
    console.log(chalk.gray('  npm run infra:up          # start docker services'));
  }
  if (ctx.ormPrisma) {
    console.log(chalk.gray('  npm run prisma:migrate    # create the schema'));
  }
  console.log(chalk.gray('  npm run start:dev\n'));
}

async function create() {
  console.log(chalk.cyan.bold('\n🚀 pasha — project generator\n'));

  const manifest = await loadManifest();

  const { language } = await inquirer.prompt([
    { type: 'list', name: 'language', message: '🌐 Language?', choices: getLanguages(manifest) },
  ]);
  const { framework } = await inquirer.prompt([
    { type: 'list', name: 'framework', message: '🧩 Framework?', choices: getFrameworks(manifest, language) },
  ]);
  const architectureChoices = getArchitectures(manifest, language, framework);
  const { architecture } = await inquirer.prompt([
    { type: 'list', name: 'architecture', message: '🏗️  Architecture?', choices: architectureChoices },
  ]);
  const architectureLabel = (architectureChoices.find((c) => c.value === architecture) || {}).name || architecture;

  const templateName = getTemplateDir(manifest, language, framework, architecture);
  const templateDir = path.join(TEMPLATES_ROOT, templateName);
  const templateConfig = await fs.readJson(path.join(templateDir, 'template.json'));

  await ensurePrerequisites(templateConfig.prerequisites);

  log.title('📝 Project info');
  const baseAnswers = await inquirer.prompt([
    {
      type: 'input', name: 'projectName', message: '✏️  Project name?',
      validate: (v) => /^[a-z0-9-]+$/.test(v) || 'Lowercase letters, numbers, and hyphens only',
    },
    { type: 'input', name: 'author', message: '👤 Your full name?', validate: (v) => v.trim().length > 0 },
    { type: 'input', name: 'github', message: '🐙 GitHub username?', validate: (v) => /^[a-zA-Z0-9-]+$/.test(v) },
    { type: 'input', name: 'description', message: '📝 Short description?', default: 'Built with pasha CLI' },
  ]);

  const stackAnswers = templateConfig.stackFeatures ? await askStackFeatures() : {};
  const flags = templateConfig.stackFeatures ? features.deriveFlags(stackAnswers) : {};
  const modules = await askModules(templateConfig);

  const ctx = Object.assign({}, baseAnswers, flags, {
    modules,
    architectureLabel,
    language,
    framework,
    // Pre-computed because docker-compose needs it inside a shell-style
    // default, where an inline helper call would collide with the braces.
    dbName: String(baseAnswers.projectName).replace(/-/g, '_').toLowerCase(),
  });

  if (templateConfig.stackFeatures) {
    const deps = features.resolveDependencies(flags);
    ctx.dependenciesJson = JSON.stringify(deps.dependencies, null, 4).replace(/\n/g, '\n  ');
    ctx.devDependenciesJson = JSON.stringify(deps.devDependencies, null, 4).replace(/\n/g, '\n  ');
    ctx.scriptsJson = JSON.stringify(features.resolveScripts(flags), null, 4).replace(/\n/g, '\n  ');
  }

  const outDir = path.resolve(process.cwd(), ctx.projectName);
  if (await fs.pathExists(outDir)) {
    log.fail(`Directory "${ctx.projectName}" already exists.`);
    process.exit(1);
  }

  const shouldInclude = makeIncludeCheck(templateConfig.fileConditions, ctx);

  const spinner = ora('Generating files...').start();
  try {
    await fs.ensureDir(outDir);

    // Shared framework files first, then template-specific ones so a template
    // can override anything it needs to.
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
    log.title('📦 Installing dependencies (npm install)...');
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

  if (templateConfig.gitInit) {
    const { doGit } = await inquirer.prompt([
      { type: 'confirm', name: 'doGit', message: '📁 Run git init and first commit?', default: true },
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

  console.log(chalk.bold.green(`\n🎉 Your project is ready: ${outDir}`));
  printNextSteps(ctx);
}

module.exports = { create };
