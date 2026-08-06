'use strict';
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const { execa } = require('execa');

const log = require('../utils/logger');
const { loadManifest, getLanguages, getFrameworks, getArchitectures, getTemplateDir } = require('../core/manifest');
const { renderTemplateDir } = require('../core/engine');
const { checkAll, installTool } = require('../core/prerequisites');

const TEMPLATES_ROOT = path.join(__dirname, '../../templates');

async function ensurePrerequisites(tools) {
  if (!tools?.length) return;
  log.title('🩺 Checking prerequisites...');
  const results = await checkAll(tools);
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

async function create() {
  console.log(chalk.cyan.bold('\n🚀 pasha — project generator\n'));

  const manifest = await loadManifest();

  const { language } = await inquirer.prompt([
    { type: 'list', name: 'language', message: '🌐 Language?', choices: getLanguages(manifest) },
  ]);
  const { framework } = await inquirer.prompt([
    { type: 'list', name: 'framework', message: '🧩 Framework?', choices: getFrameworks(manifest, language) },
  ]);
  const { architecture } = await inquirer.prompt([
    { type: 'list', name: 'architecture', message: '🏗️  Architecture?', choices: getArchitectures(manifest, language, framework) },
  ]);

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

  const extraAnswers = templateConfig.prompts?.length
    ? await inquirer.prompt(templateConfig.prompts.map((p) => ({ type: 'input', ...p })))
    : {};

  const ctx = { ...baseAnswers, ...extraAnswers };
  const outDir = path.resolve(process.cwd(), ctx.projectName);

  if (await fs.pathExists(outDir)) {
    log.fail(`Directory "${ctx.projectName}" already exists.`);
    process.exit(1);
  }

  const spinner = ora('Generating files...').start();
  try {
    await fs.ensureDir(outDir);
    await renderTemplateDir(path.join(templateDir, 'files'), outDir, ctx);
    spinner.succeed(chalk.green('Files generated'));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }

  if (templateConfig.postInstall?.includes('npm install')) {
    const s = ora('Running npm install...').start();
    try {
      await execa('npm', ['install'], { cwd: outDir });
      s.succeed(chalk.green('npm install done'));
    } catch {
      s.warn('Run npm install manually');
    }
  }

  if (templateConfig.gitInit) {
    const { doGit } = await inquirer.prompt([
      { type: 'confirm', name: 'doGit', message: '📁 Run git init and first commit?', default: true },
    ]);
    if (doGit) {
      const sg = ora('Setting up git...').start();
      try {
        await execa('git', ['init'], { cwd: outDir });
        await execa('git', ['add', '.'], { cwd: outDir });
        await execa('git', ['commit', '-m', 'feat: init ' + ctx.projectName], { cwd: outDir });
        sg.succeed(chalk.green('git set up'));
      } catch {
        sg.warn('Run git init manually');
      }
    }
  }

  console.log(chalk.bold.green(`\n🎉 Your project is ready: ${outDir}\n`));
  console.log(chalk.gray(`  cd ${ctx.projectName}`));
  console.log(chalk.gray(`  npm run start:dev\n`));
}

module.exports = { create };
