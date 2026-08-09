'use strict';
const { W, COLORS } = require('../theme');
const { bar, padC, padR, strip, row, BOX } = require('../layout');
const chalk = require('chalk');

const SUMMARY_KEYS = [
  ['Project', 'projectName'],
  ['Author', 'author'],
  ['GitHub', 'github'],
  ['Description', 'description'],
  ['Language', 'language'],
  ['Framework', 'framework'],
  ['Architecture', 'architectureLabel'],
  ['ORM', 'orm'],
  ['Database', 'database'],
  ['Validation', 'validation'],
  ['Redis', null],
  ['Broker', 'broker'],
  ['Swagger', null],
  ['Lint', null],
  ['Tests', null],
  ['CI', null],
  ['Auth', null],
  ['Health', null],
  ['Docker', null],
  ['Rate Limit', null],
];

const BOOL_KEYS = new Set(['useRedis', 'useSwagger', 'useLint', 'useTests', 'useCI', 'useAuth', 'useHealthCheck', 'useDocker', 'useRateLimit', 'useAgentDocs']);

function boolLabel(val) {
  return val ? COLORS.success('Yes') : COLORS.dim('No');
}

const EXTRA_LABELS = {
  useRedis: 'Redis',
  useSwagger: 'Swagger',
  useLint: 'Lint',
  useTests: 'Tests',
  useCI: 'CI',
  useAuth: 'Auth',
  useHealthCheck: 'Health',
  useDocker: 'Docker',
  useRateLimit: 'Rate Limit',
  useAgentDocs: 'AGENT.md',
};

function summary(ctx) {
  const rows = [];

  for (const [label, key] of SUMMARY_KEYS) {
    if (key === null) continue;
    const val = ctx[key];
    if (val === undefined || val === null || val === '') continue;
    rows.push([label, String(val)]);
  }

  for (const [key, label] of Object.entries(EXTRA_LABELS)) {
    if (ctx[key] !== undefined) {
      rows.push([label, boolLabel(ctx[key])]);
    }
  }

  if (Array.isArray(ctx.modules) && ctx.modules.length) {
    rows.push(['Modules', ctx.modules.length + ' (' + ctx.modules.join(', ') + ')']);
  }

  if (!rows.length) return;

  const labelW = Math.max(...rows.map(r => strip(r[0]).length)) + 1;

  console.log('');
  console.log(COLORS.primary(BOX.TL + bar() + BOX.TR));
  console.log(row(padC(chalk.bold.white('Configuration Summary'), W)));
  console.log(COLORS.primary(BOX.T_ + bar() + BOX._T));

  for (const [label, value] of rows) {
    const lbl = chalk.bold(label);
    const pad = Math.max(0, labelW - strip(label).length);
    const line = '  ' + lbl + ' '.repeat(pad) + value;
    console.log(row(line));
  }

  console.log(COLORS.primary(BOX.BL + bar() + BOX.BR));
  console.log('');
}

module.exports = { summary };
