'use strict';

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { execa } = require('execa');
const { nodejsTemplate, pythonTemplate, shellTemplate } = require('../templates');

const BANNER = `
\u001b[36m██████╗  █████╗ ███████╗██╗  ██╗ █████╗ \u001b[0m
\u001b[36m██╔══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗\u001b[0m
\u001b[36m██████╔╝███████║███████╗███████║███████║\u001b[0m
\u001b[36m██╔═══╝ ██╔══██║╚════██║██╔══██║██╔══██║\u001b[0m
\u001b[36m██║     ██║  ██║███████║██║  ██║██║  ██║\u001b[0m
\u001b[36m╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝\u001b[0m
`;

const i18n = {
  fa: {
    welcome: '🚀 به pasha CLI generator خوش اومدی!',
    templateQ: '📦 چه نوع CLI ای می‌خوای بسازی؟',
    colorQ: '🎨 رنگ theme CLI ات؟',
    nameQ: '✏️  اسم CLI ات چیه؟',
    nameHint: '(فقط حروف کوچیک، عدد و خط تیره)',
    authorQ: '👤 اسم کاملت؟',
    githubQ: '🐙 GitHub username ات؟',
    descQ: '📝 توضیح کوتاه؟',
    tokenQ: '🔑 npm token داری؟ (برای publish لازمه)',
    tokenInputQ: '🔑 توکنت رو وارد کن (npmjs.com → Access Tokens → Granular → Bypass 2FA):',
    publishQ: '🚀 الان npm publish بکنم؟',
    gitQ: '📁 git init و اول commit بزنم؟',
    creating: 'در حال ساخت فایل‌ها...',
    installing: 'در حال نصب dependencies...',
    gitting: 'در حال راه‌اندازی git...',
    publishing: 'در حال publish روی npm...',
    done: '🎉 CLI ات آماده‌ست!',
    publishDone: '✅ publish شد!',
    publishSkip: '⏭️  publish رو skip کردی.',
    nextSteps: '📋 قدم‌های بعدی:',
    tokenSaved: '✅ token ذخیره شد',
    templates: { nodejs: 'Node.js CLI (Commander.js)', python: 'Python CLI (Click)', shell: 'Shell Script' },
    colors: { cyan: '🔵 Cyan', green: '🟢 Green', magenta: '🟣 Magenta', yellow: '🟡 Yellow' },
  },
  en: {
    welcome: '🚀 Welcome to pasha CLI generator!',
    templateQ: '📦 What type of CLI do you want to build?',
    colorQ: '🎨 CLI theme color?',
    nameQ: '✏️  CLI name?',
    nameHint: '(lowercase letters, numbers, hyphens only)',
    authorQ: '👤 Your full name?',
    githubQ: '🐙 Your GitHub username?',
    descQ: '📝 Short description?',
    tokenQ: '🔑 Do you have an npm token? (required for publish)',
    tokenInputQ: '🔑 Enter your token (npmjs.com → Access Tokens → Granular → Bypass 2FA):',
    publishQ: '🚀 Publish to npm now?',
    gitQ: '📁 Run git init and first commit?',
    creating: 'Creating files...',
    installing: 'Installing dependencies...',
    gitting: 'Setting up git...',
    publishing: 'Publishing to npm...',
    done: '🎉 Your CLI is ready!',
    publishDone: '✅ Published!',
    publishSkip: '⏭️  Skipped publish.',
    nextSteps: '📋 Next steps:',
    tokenSaved: '✅ Token saved',
    templates: { nodejs: 'Node.js CLI (Commander.js)', python: 'Python CLI (Click)', shell: 'Shell Script' },
    colors: { cyan: '🔵 Cyan', green: '🟢 Green', magenta: '🟣 Magenta', yellow: '🟡 Yellow' },
  },
};

async function create() {
  console.log(BANNER);

  // Step 1: language
  const { lang } = await inquirer.prompt([{
    type: 'list', name: 'lang',
    message: '🌐 Language / زبان؟',
    choices: [{ name: 'فارسی', value: 'fa' }, { name: 'English', value: 'en' }],
  }]);

  const t = i18n[lang];
  console.log('\n' + chalk.bold(t.welcome) + '\n');

  // Step 2: template
  const { template } = await inquirer.prompt([{
    type: 'list', name: 'template', message: t.templateQ,
    choices: [
      { name: t.templates.nodejs, value: 'nodejs' },
      { name: t.templates.python, value: 'python' },
      { name: t.templates.shell, value: 'shell' },
    ],
  }]);

  // Step 3: color (only nodejs)
  let color = 'cyan';
  if (template === 'nodejs') {
    const res = await inquirer.prompt([{
      type: 'list', name: 'color', message: t.colorQ,
      choices: Object.entries(t.colors).map(([value, name]) => ({ name, value })),
    }]);
    color = res.color;
  }

  // Step 4: project info
  const answers = await inquirer.prompt([
    {
      type: 'input', name: 'name', message: `${t.nameQ} ${chalk.gray(t.nameHint)}`,
      validate: (v) => /^[a-z0-9-]+$/.test(v) || (lang === 'fa' ? 'فقط حروف کوچیک و خط تیره' : 'Lowercase letters and hyphens only'),
    },
    {
      type: 'input', name: 'author', message: t.authorQ,
      validate: (v) => v.trim().length > 0,
    },
    {
      type: 'input', name: 'github', message: t.githubQ,
      validate: (v) => /^[a-zA-Z0-9-]+$/.test(v) || 'Invalid GitHub username',
    },
    {
      type: 'input', name: 'description', message: t.descQ,
      default: lang === 'fa' ? 'ابزار CLI شخصی من' : 'My personal CLI tool',
    },
  ]);

  // Step 5: npm token
  let npmToken = null;
  if (template === 'nodejs') {
    const { hasToken } = await inquirer.prompt([{
      type: 'confirm', name: 'hasToken', message: t.tokenQ, default: true,
    }]);

    if (hasToken) {
      const { token } = await inquirer.prompt([{
        type: 'password', name: 'token', message: t.tokenInputQ,
        validate: (v) => v.trim().startsWith('npm_') || (lang === 'fa' ? 'token باید با npm_ شروع بشه' : 'Token must start with npm_'),
      }]);
      npmToken = token.trim();

      // save token to .npmrc
      const npmrcPath = path.join(os.homedir(), '.npmrc');
      const npmrcLine = `//registry.npmjs.org/:_authToken=${npmToken}`;
      let existing = '';
      try { existing = fs.readFileSync(npmrcPath, 'utf8'); } catch {}
      if (!existing.includes('_authToken')) {
        fs.writeFileSync(npmrcPath, existing + '\n' + npmrcLine + '\n');
      } else {
        fs.writeFileSync(npmrcPath, existing.replace(/\/\/registry\.npmjs\.org\/:_authToken=.*/g, npmrcLine));
      }
      console.log(chalk.green(t.tokenSaved));
    }
  }

  const config = { ...answers, lang, template, color };
  const outDir = path.resolve(process.cwd(), config.name);

  // Step 6: generate files
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

  // Step 7: npm install
  if (template === 'nodejs') {
    const s = ora(t.installing).start();
    try {
      await execa('npm', ['install'], { cwd: outDir });
      s.succeed(chalk.green(t.installing.replace('...', ' ✅')));
    } catch {
      s.warn(lang === 'fa' ? 'npm install رو خودت اجرا کن' : 'Run npm install manually');
    }
  }

  // Step 8: git init
  const { doGit } = await inquirer.prompt([{
    type: 'confirm', name: 'doGit', message: t.gitQ, default: true,
  }]);

  if (doGit) {
    const sg = ora(t.gitting).start();
    try {
      await execa('git', ['init'], { cwd: outDir });
      await execa('git', ['add', '.'], { cwd: outDir });
      await execa('git', ['commit', '-m', 'feat: init ' + config.name + ' CLI'], { cwd: outDir });
      sg.succeed(chalk.green(t.gitting.replace('...', ' ✅')));
    } catch {
      sg.warn(lang === 'fa' ? 'git رو خودت راه‌اندازی کن' : 'Run git init manually');
    }
  }

  // Step 9: publish
  if (template === 'nodejs') {
    const { shouldPublish } = await inquirer.prompt([{
      type: 'confirm', name: 'shouldPublish', message: t.publishQ, default: !!npmToken,
    }]);

    if (shouldPublish) {
      const sp = ora(t.publishing).start();
      try {
        const env = { ...process.env };
        if (npmToken) env.NPM_TOKEN = npmToken;
        await execa('npm', ['publish', '--access', 'public'], { cwd: outDir, env });
        sp.succeed(chalk.green(t.publishDone));
        console.log(chalk.cyan(`\n📦 https://www.npmjs.com/package/@${config.github}/${config.name}`));
      } catch (err) {
        sp.fail(chalk.red(lang === 'fa' ? 'publish ناموفق — token رو چک کن' : 'Publish failed — check your token'));
      }
    } else {
      console.log('\n' + chalk.yellow(t.publishSkip));
    }
  }

  // Step 10: summary
  const C = chalk[color] || chalk.cyan;
  console.log('\n' + chalk.bold(t.done));
  console.log(C('\n  ' + config.name + ' CLI') + chalk.gray(' — @' + config.github + '/' + config.name));
  console.log('\n' + chalk.bold(t.nextSteps));

  if (template === 'nodejs') {
    console.log(chalk.gray(`  cd ${config.name}`));
    console.log(chalk.gray(`  node bin/index.js hello`));
    console.log(chalk.gray(`  ${config.name} info`));
    console.log(chalk.gray(`  ${config.name} config set name ${config.author}`));
  } else if (template === 'python') {
    console.log(chalk.gray(`  cd ${config.name} && pip install -e .`));
    console.log(chalk.gray(`  ${config.name} hello`));
  } else {
    console.log(chalk.gray(`  cd ${config.name} && chmod +x ${config.name}.sh`));
    console.log(chalk.gray(`  bash ${config.name}.sh hello`));
  }

  console.log('\n' + C(`⭐ https://github.com/${config.github}/${config.name}`) + '\n');
}

module.exports = { create };
