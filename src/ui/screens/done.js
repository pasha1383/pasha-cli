'use strict';
const { W, VERSION, COLORS } = require('../theme');
const { bar, padC, row, BOX } = require('../layout');
const chalk = require('chalk');
const io = require('../io');

function done(outPath, ctx) {
  if (!io.isTTY() || io.isCI() || io.noColor()) {
    console.log(`\nProject ready at ${outPath}`);
    console.log(`\nNext: cd ${ctx.projectName}`);
    return;
  }

  console.log('');
  console.log(COLORS.success(BOX.TL + bar() + BOX.TR));
  console.log(COLORS.success(BOX.V) + padC(chalk.bold.white('Project Ready'), W) + COLORS.success(BOX.V));
  console.log(COLORS.success(BOX.BL + bar() + BOX.BR));
  console.log('');
  console.log('  ' + COLORS.success.bold(outPath));

  const summaryParts = [ctx.languageLabel || ctx.language, ctx.frameworkLabel || ctx.framework, ctx.architectureLabel || ctx.architecture]
    .filter(Boolean);
  if (summaryParts.length) {
    console.log('  ' + COLORS.dim(summaryParts.join(' · ')));
  }

  console.log('');
  console.log(COLORS.dim('  ' + '─'.repeat(28)));
  console.log(chalk.bold('  Next steps:'));
  console.log(COLORS.dim('  $ cd ' + ctx.projectName));

  const isNode = ctx.language === 'node';
  const isPython = ctx.language === 'python';
  const isGo = ctx.language === 'go';

  if (isPython) {
    console.log(COLORS.dim('  $ python3 -m venv venv'));
    console.log(COLORS.dim('  $ source venv/bin/activate'));
    console.log(COLORS.dim('  $ pip install -r requirements.txt'));
    if (ctx.devRequirementsTxt) {
      console.log(COLORS.dim('  $ pip install -r dev-requirements.txt'));
    }
  }

  if (isGo) {
    console.log(COLORS.dim('  $ go mod tidy'));
  }

  if (isNode) {
    console.log(COLORS.dim('  $ npm install'));
  }

  if (ctx.useDocker) {
    console.log(COLORS.dim('  $ cp .env.example .env'));
    if (isNode) {
      console.log(COLORS.dim('  $ npm run infra:up'));
    } else {
      console.log(COLORS.dim('  $ docker compose up -d'));
    }
  }

  if (isPython) {
    if (ctx.ormDjango) {
      console.log(COLORS.dim('  $ python manage.py migrate'));
      console.log(COLORS.dim('  $ python manage.py runserver'));
    } else {
      console.log(COLORS.dim('  $ uvicorn src.main:create_app --reload --factory --host 0.0.0.0 --port 8000'));
    }
  } else if (isGo) {
    console.log(COLORS.dim('  $ go run .'));
  } else {
    if (ctx.ormPrisma) {
      console.log(COLORS.dim('  $ npm run prisma:migrate'));
    }
    console.log(COLORS.dim('  $ npm run start:dev'));
  }

  if (ctx.useSwagger) {
    if (isPython && ctx.ormDjango) {
      console.log(COLORS.dim('  # API docs at http://localhost:8000/api/docs/'));
    } else if (isPython) {
      console.log(COLORS.dim('  # API docs at http://localhost:8000/docs'));
    } else {
      console.log(COLORS.dim('  # API docs at http://localhost:3000/api/docs'));
    }
  }
  console.log('');
}

module.exports = { done };
