'use strict';
const chalk = require('chalk');
const { prompt } = require('../../src/ui/prompts');
const { Spinner } = require('../../src/ui/screens/progress');
const pkg = require('../../package.json');

const W  = 65;
const H  = '─';
const V  = '│';
const TL = '┌';
const TR = '┐';
const BL = '└';
const BR = '┘';
const T_ = '├';
const _T = '┤';

function strip(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, '');
}

function bar(ch = '─') { return ch.repeat(W); }

function padR(text, width) {
  const len = strip(text).length;
  return text + ' '.repeat(Math.max(0, width - len));
}

function padC(text, width) {
  const len = strip(text).length;
  const left = Math.max(0, Math.floor((width - len) / 2));
  return ' '.repeat(left) + text + ' '.repeat(Math.max(0, width - len - left));
}

function row(content) {
  return chalk.cyan(V) + padR(content, W) + chalk.cyan(V);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const LABELS = {
  language:            'Language',
  framework:           'Framework',
  architecture:        'Architecture',
  architectureLabel:   'Architecture',
  projectName:         'Project',
  author:              'Author',
  github:              'GitHub',
  description:         'Description',
  orm:                 'ORM',
  database:            'Database',
  validation:          'Validation',
  useRedis:            'Redis',
  broker:              'Broker',
  useAgentDocs:        'AGENT.md',
  useTests:            'Tests',
  useSwagger:          'Swagger',
  useDocker:           'Docker',
};

const SKIP = new Set([
  'dependenciesJson',
  'devDependenciesJson',
  'scriptsJson',
  'jestConfigJson',
  'dbName',
  'architectureLabel',
  'ormPrisma',
  'ormTypeOrm',
  'ormMikroOrm',
  'ormMongoose',
  'ormDrizzle',
  'ormDjango',
  'ormSqlalchemy',
  'ormTortoise',
  'ormNone',
  'hasOrm',
  'dbPostgres',
  'dbMysql',
  'dbSqlite',
  'dbMongo',
  'hasDatabase',
  'dbNeedsServer',
  'dbPort',
  'usePydantic',
  'useClassValidator',
  'useZod',
  'useExpressValidator',
  'hasValidation',
  'useKafka',
  'useRabbitmq',
  'hasBroker',
  'useLint',
  'useCI',
  'useAuth',
  'useHealthCheck',
  'useAppDockerfile',
  'useRateLimit',
  'healthChecksDb',
  'healthChecksRedis',
  'hasSharedInfra',
  'hasOrmClassEntity',
  'requirementsTxt',
  'devRequirementsTxt',
  'needsCoreTokens',
  'decorateDtoForSwagger',
  'extras',
  'goModules',
]);

const BOOL_KEYS = new Set([
  'useRedis', 'useAgentDocs', 'useTests', 'useSwagger', 'useDocker',
]);

function boolLabel(val) {
  return val ? chalk.green('Yes') : chalk.dim('No');
}

function welcome() {
  const logo = [
    '  ____             __         ',
    ' / __ \\____  _____/ /_  ____ _',
    '/ /_/ / __ `/ ___/ __ \\/ __ `/',
    '/ ____/ /_/ (__  ) / / / /_/ /',
    '/_/    \\__,_/____/_/ /_/\\__,_/ ',
  ];

  console.log('');
  console.log(chalk.cyan(TL + bar() + TR));
  for (const ln of logo) {
    console.log(row('  ' + chalk.white.bold(ln)));
  }
  console.log(row(''));
  console.log(row(padC(chalk.dim(`project generator v${pkg.version}`), W)));
  console.log(chalk.cyan(BL + bar() + BR));
  console.log('');
  console.log(chalk.cyan('  ') + chalk.white.bold("Let's build your project.") + chalk.dim('  Press Ctrl+C to cancel anytime.'));
  console.log('');
}

function step(current, total, title) {
  const prefix = chalk.cyan(`┌  Step ${current}/${total}`);
  const sep = chalk.cyan(' · ');
  console.log(prefix + sep + chalk.bold.white(title));
}

function section(title) {
  console.log('');
  console.log(chalk.cyan(bar()));
  console.log('  ' + chalk.bold.white(title));
  console.log(chalk.cyan(bar()));
  console.log('');
}

function summary(ctx) {
  const title = 'Configuration Summary';
  const rows = [];

  for (const [key, label] of Object.entries(LABELS)) {
    const val = ctx[key];
    if (val === undefined || val === null || val === '') continue;
    if (key === 'architecture' && LABELS.architectureLabel) continue;
    if (BOOL_KEYS.has(key)) {
      rows.push([label, boolLabel(val)]);
    } else {
      rows.push([label, String(val)]);
    }
  }

  if (Array.isArray(ctx.modules) && ctx.modules.length) {
    rows.push(['Modules', ctx.modules.length + ' module' +
      (ctx.modules.length !== 1 ? 's' : '') + ' (' + ctx.modules.join(', ') + ')']);
  }
  if (Array.isArray(ctx.extras) && ctx.extras.length) {
    rows.push(['Extras', ctx.extras.map(String).join(', ')]);
  }

  for (const key of Object.keys(ctx)) {
    if (LABELS.hasOwnProperty(key) || SKIP.has(key)) continue;
    if (key === 'modules' || key === 'extras') continue;
    const val = ctx[key];
    if (val === undefined || val === null || val === '') continue;
    const s = typeof val === 'string' ? val : String(val);
    if (s.length > 400) continue;
    rows.push([key, s]);
  }

  if (!rows.length) return;

  const labelW = Math.max(...rows.map(r => strip(r[0]).length)) + 1;

  console.log('');
  console.log(chalk.cyan(TL + bar() + TR));
  console.log(row(padC(chalk.bold.white(title), W)));
  console.log(chalk.cyan(T_ + bar() + _T));

  for (const [label, value] of rows) {
    const lbl = chalk.bold(label);
    const pad = Math.max(0, labelW - strip(label).length);
    const line = '  ' + lbl + ' '.repeat(pad) + value;
    console.log(row(line));
  }

  console.log(chalk.cyan(BL + bar() + BR));
  console.log('');
}

async function confirm(message) {
  console.log(chalk.cyan('  ' + TL + '── Confirm'));
  const { answer } = await prompt([{
    type: 'confirm',
    name: 'answer',
    message: chalk.white(message),
    default: true,
  }]);
  return answer;
}

function done(outPath, ctx) {
  const title = chalk.green('✓') + '  Project Ready';

  console.log('');
  console.log(chalk.green(TL + bar() + TR));
  console.log(chalk.green(V) + padC(chalk.bold.white(title), W) + chalk.green(V));
  console.log(chalk.green(BL + bar() + BR));
  console.log('');
  console.log('  ' + chalk.green.bold(outPath));
  console.log('');

  if (!ctx) return;

  console.log(chalk.bold('  Next steps:'));
  console.log(chalk.dim('  cd ' + ctx.projectName));

  const isPython = ctx.language === 'python';
  const isGo = ctx.language === 'go';

  if (isPython) {
    console.log(chalk.dim('  python3 -m venv venv'));
    console.log(chalk.dim('  source venv/bin/activate'));
    console.log(chalk.dim('  pip install -r requirements.txt'));
    if (ctx.devRequirementsTxt) {
      console.log(chalk.dim('  pip install -r dev-requirements.txt'));
    }
  }
  if (isGo) {
    console.log(chalk.dim('  go mod tidy'));
  }

  if (ctx.useDocker) {
    console.log(chalk.dim('  cp .env.example .env'));
    if (isPython || isGo) {
      console.log(chalk.dim('  docker compose up -d'));
    } else {
      console.log(chalk.dim('  npm run infra:up'));
    }
  }

  if (isPython) {
    if (ctx.ormDjango) {
      console.log(chalk.dim('  python manage.py migrate'));
      console.log(chalk.dim('  python manage.py runserver'));
    } else {
      console.log(chalk.dim('  uvicorn src.main:create_app --reload --factory --host 0.0.0.0 --port 8000'));
    }
  } else if (isGo) {
    console.log(chalk.dim('  go run .'));
  } else {
    if (ctx.ormPrisma) {
      console.log(chalk.dim('  npm run prisma:migrate'));
    }
    console.log(chalk.dim('  npm run start:dev'));
  }

  if (ctx.useSwagger) {
    if (isPython && ctx.ormDjango) {
      console.log(chalk.dim('  # then open http://localhost:8000/api/docs/'));
    } else if (isPython) {
      console.log(chalk.dim('  # then open http://localhost:8000/docs'));
    } else {
      console.log(chalk.dim('  # then open http://localhost:3000/api/docs'));
    }
  }
  console.log('');
}

function info(text) {
  console.log('');
  console.log(chalk.cyan.dim(TL + bar() + TR));
  console.log(chalk.cyan.dim(V) + padR('  ' + text, W) + chalk.cyan.dim(V));
  console.log(chalk.cyan.dim(BL + bar() + BR));
  console.log('');
}

function error(text, err) {
  console.log('');
  console.log(chalk.red(TL + bar() + TR));
  console.log(chalk.red(V) + padC('  ' + chalk.bold.white('✗  ' + text), W) + chalk.red(V));
  if (err && err.message) {
    console.log(chalk.red(V) + padR('  ' + chalk.dim(err.message), W) + chalk.red(V));
  }
  console.log(chalk.red(BL + bar() + BR));
  console.log('');
}

function spinner(msg) {
  return new Spinner(chalk.cyan(msg));
}

function spirit(text) {
  return new Spinner(chalk.cyan(text)).start();
}

function progress(steps) {
  console.log('');
  for (const s of steps) {
    let icon;
    if (s.status === 'done') icon = chalk.green('  ✓');
    else if (s.status === 'active') icon = chalk.cyan('  →');
    else icon = chalk.dim('  ▪');

    const name = s.status === 'active'
      ? chalk.bold.white(s.name)
      : s.status === 'done'
        ? s.name
        : chalk.dim(s.name);

    console.log(`${icon}  ${name}`);
  }
  console.log('');
}

function keyValue(key, value) {
  const sep = chalk.cyan(' · ');
  console.log(`  ${chalk.bold(key)}${sep}${value}`);
}

function divider() {
  console.log('');
  console.log(chalk.dim(bar()));
  console.log('');
}

async function typewriter(text, delay = 150) {
  await sleep(delay);
  console.log(text);
}

function chat(title, lines) {
  const msgs = Array.isArray(lines) ? lines : [lines];

  console.log('');
  console.log(chalk.cyan(TL + bar() + TR));
  console.log(row('  ' + chalk.bold.white(title)));
  console.log(row(''));
  for (const line of msgs) {
    console.log(row('  ' + line));
  }
  console.log(row(''));
  console.log(chalk.cyan(BL + bar() + BR));
  console.log('');
}

function serviceHeader(n, total, name) {
  const num = total ? chalk.dim(` (${n}/${total})`) : '';
  console.log('');
  console.log(chalk.cyan(`  ${T_}── `) + chalk.bold.white(name) + num);
  console.log('');
}

function banner() {
  console.log('');
  console.log(chalk.cyan(TL + bar() + TR));
  console.log(row(padC(chalk.white.bold('pasha  v' + pkg.version), W)));
  console.log(chalk.cyan(BL + bar() + BR));
  console.log('');
}

async function prompt(question) {
  console.log(chalk.cyan(`  ${TL}─ ${chalk.bold.white(question.message || '')}`));
  const answers = await prompt([question]);
  return answers[question.name];
}

function serviceSummary(ctx, index) {
  const label = index !== undefined ? `Service ${index}` : 'Service';
  const rows = [];

  for (const [key, lbl] of Object.entries(LABELS)) {
    const val = ctx[key];
    if (val === undefined || val === null || val === '') continue;
    if (BOOL_KEYS.has(key)) {
      rows.push([lbl, boolLabel(val)]);
    } else {
      rows.push([lbl, String(val)]);
    }
  }

  if (Array.isArray(ctx.modules) && ctx.modules.length) {
    rows.push(['Modules', ctx.modules.join(', ')]);
  }

  if (!rows.length) return;

  const labelW = Math.max(...rows.map(r => strip(r[0]).length)) + 1;

  console.log('');
  console.log(chalk.cyan(`  ${T_}${H.repeat(3)} ${chalk.bold.white(label)}`));
  for (const [key, value] of rows) {
    const lbl = chalk.bold(key);
    const pad = Math.max(0, labelW - strip(key).length);
    console.log(row('  ' + lbl + ' '.repeat(pad) + value));
  }
  console.log('');
}

module.exports = {
  welcome,
  step,
  section,
  summary,
  confirm,
  done,
  info,
  error,
  spinner,
  spirit,
  progress,
  keyValue,
  divider,
  typewriter,
  chat,
  serviceHeader,
  banner,
  prompt,
  serviceSummary,
};
