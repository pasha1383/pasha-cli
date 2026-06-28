'use strict';

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const { execa } = require('execa');
const { nodejsTemplate, pythonTemplate, shellTemplate } = require('../templates');

const BANNER = `
${chalk.cyan('██████╗  █████╗ ███████╗██╗  ██╗ █████╗ ')}
${chalk.cyan('██╔══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗')}
${chalk.cyan('██████╔╝███████║███████╗███████║███████║')}
${chalk.cyan('██╔═══╝ ██╔══██║╚════██║██╔══██║██╔══██║')}
${chalk.cyan('██║     ██║  ██║███████║██║  ██║██║  ██║')}
${chalk.cyan('╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝')}
`;

const i18n = {
  fa: {
    welcome: '🚀 به pasha CLI generator خوش اومدی!',
    langQ: '🌐 زبان رابط کاربری؟',
    templateQ: '📦 چه نوع CLI ای می‌خوای بسازی؟',
    nameQ: '✏️  اسم CLI ات چیه؟',
    nameHint: '(فقط حروف کوچیک، عدد و خط تیره)',
    authorQ: '👤 اسم کاملت؟',
    githubQ: '🐙 GitHub username ات؟',
    descQ: '📝 توضیح کوتاه درباره CLI ات؟',
    publishQ: '🚀 الان npm publish بکنم؟',
    creating: 'در حال ساخت فایل‌ها...',
    installing: 'در حال نصب dependencies...',
    publishing: 'در حال publish روی npm...',
    done: '🎉 CLI ات آماده‌ست!',
    publishDone: '✅ publish شد!',
    publishSkip: '⏭️  publish رو skip کردی.',
    nextSteps: '📋 قدم‌های بعدی:',
    templates: {
      nodejs: 'Node.js CLI (Commander.js)',
      python: 'Python CLI (Click)',
      shell: 'Shell Script',
    },
  },
  en: {
    welcome: '🚀 Welcome to pasha CLI generator!',
    langQ: '🌐 Interface language?',
    templateQ: '📦 What type of CLI do you want to build?',
    nameQ: '✏️  CLI name?',
    nameHint: '(lowercase letters, numbers, hyphens only)',
    authorQ: '👤 Your full name?',
    githubQ: '🐙 Your GitHub username?',
    descQ: '📝 Short description of your CLI?',
    publishQ: '🚀 Publish to npm now?',
    creating: 'Creating files...',
    installing: 'Installing dependencies...',
    publishing: 'Publishing to npm...',
    done: '🎉 Your CLI is ready!',
    publishDone: '✅ Published!',
    publishSkip: '⏭️  Skipped publish.',
    nextSteps: '📋 Next steps:',
    templates: {
      nodejs: 'Node.js CLI (Commander.js)',
      python: 'Python CLI (Click)',
      shell: 'Shell Script',
    },
  },
};

async function create() {
  console.log(BANNER);

  // Step 1: language
  const { lang } = await inquirer.prompt([
    {
      type: 'list',
      name: 'lang',
      message: '🌐 Language / زبان؟',
      choices: [
        { name: 'فارسی', value: 'fa' },
        { name: 'English', value: 'en' },
      ],
    },
  ]);

  const t = i18n[lang];
  console.log('\n' + chalk.bold(t.welcome) + '\n');

  // Step 2: template
  const { template } = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: t.templateQ,
      choices: [
        { name: t.templates.nodejs, value: 'nodejs' },
        { name: t.templates.python, value: 'python' },
        { name: t.templates.shell, value: 'shell' },
      ],
    },
  ]);

  // Step 3: project info
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: `${t.nameQ} ${chalk.gray(t.nameHint)}`,
      validate: (v) => /^[a-z0-9-]+$/.test(v) || (lang === 'fa' ? 'فقط حروف کوچیک و خط تیره' : 'Lowercase letters and hyphens only'),
    },
    {
      type: 'input',
      name: 'author',
      message: t.authorQ,
      validate: (v) => v.trim().length > 0,
    },
    {
      type: 'input',
      name: 'github',
      message: t.githubQ,
      validate: (v) => /^[a-zA-Z0-9-]+$/.test(v) || 'Invalid GitHub username',
    },
    {
      type: 'input',
      name: 'description',
      message: t.descQ,
      default: lang === 'fa' ? 'ابزار CLI شخصی من' : 'My personal CLI tool',
    },
  ]);

  const config = { ...answers, lang, template };
  const outDir = path.resolve(process.cwd(), config.name);

  // Step 4: generate files
  const spinner = ora(t.creating).start();

  try {
    await fs.ensureDir(outDir);

    let files = {};
    if (template === 'nodejs') files = nodejsTemplate(config);
    else if (template === 'python') files = pythonTemplate(config);
    else files = shellTemplate(config);

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(outDir, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf8');
    }

    spinner.succeed(chalk.green(t.creating.replace('...', ' ✅')));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }

  // Step 5: npm install (only for nodejs)
  if (template === 'nodejs') {
    const spinner2 = ora(t.installing).start();
    try {
      await execa('npm', ['install'], { cwd: outDir });
      spinner2.succeed(chalk.green(t.installing.replace('...', ' ✅')));
    } catch {
      spinner2.warn(lang === 'fa' ? 'npm install رو خودت اجرا کن' : 'Run npm install manually');
    }
  }

  // Step 6: publish?
  const { shouldPublish } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldPublish',
      message: t.publishQ,
      default: false,
    },
  ]);

  if (shouldPublish && template === 'nodejs') {
    const spinner3 = ora(t.publishing).start();
    try {
      await execa('npm', ['publish', '--access', 'public'], { cwd: outDir });
      spinner3.succeed(chalk.green(t.publishDone));
      console.log(chalk.cyan(`\n📦 https://www.npmjs.com/package/@${config.github}/${config.name}`));
    } catch (err) {
      spinner3.fail(chalk.red(lang === 'fa' ? 'publish ناموفق بود — npm login کردی؟' : 'Publish failed — are you logged in to npm?'));
    }
  } else {
    console.log('\n' + chalk.yellow(t.publishSkip));
  }

  // Step 7: next steps
  console.log('\n' + chalk.bold(t.done));
  console.log(chalk.bold('\n' + t.nextSteps));

  if (template === 'nodejs') {
    console.log(chalk.gray(`  cd ${config.name}`));
    console.log(chalk.gray(`  node bin/index.js hello`));
    console.log(chalk.gray(`  npm link  ${lang === 'fa' ? '# برای تست محلی' : '# for local testing'}`));
    if (!shouldPublish) {
      console.log(chalk.gray(`  npm publish --access public`));
    }
  } else if (template === 'python') {
    console.log(chalk.gray(`  cd ${config.name}`));
    console.log(chalk.gray(`  pip install -e .`));
    console.log(chalk.gray(`  ${config.name} hello`));
  } else {
    console.log(chalk.gray(`  cd ${config.name}`));
    console.log(chalk.gray(`  chmod +x ${config.name}.sh`));
    console.log(chalk.gray(`  bash ${config.name}.sh hello`));
  }

  console.log('\n' + chalk.cyan(`⭐ https://github.com/${config.github}/${config.name}`) + '\n');
}

module.exports = { create };
