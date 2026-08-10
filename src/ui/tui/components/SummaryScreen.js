'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

var SUMMARY_KEYS = [
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
  ['Broker', 'broker'],
];

var EXTRA_LABELS = {
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

function fmtBool(val) {
  return val ? 'Yes' : 'No';
}

function SummaryScreen({ context, onEdit }) {
  const { Text, Box } = getInk();
  var ctx = context || {};
  var rows = [];

  SUMMARY_KEYS.forEach(function (entry) {
    var label = entry[0];
    var key = entry[1];
    var val = ctx[key];
    if (val === undefined || val === null || val === '') return;
    rows.push([label, String(val)]);
  });

  Object.keys(EXTRA_LABELS).forEach(function (key) {
    if (ctx[key] !== undefined) {
      rows.push([EXTRA_LABELS[key], fmtBool(ctx[key])]);
    }
  });

  var mods = ctx.modules;
  if (Array.isArray(mods) && mods.length) {
    rows.push(['Modules', String(mods.length) + ' (' + mods.join(', ') + ')']);
  }

  var rowElements = rows.map(function (entry, idx) {
    var label = entry[0];
    var value = entry[1];
    var editHint = onEdit ? e(Text, { dimColor: true, color: 'cyan' }, '  [e:' + String(idx + 1) + ' edit]') : null;

    return e(Box, { key: idx, flexDirection: 'row' },
      e(Text, { bold: true }, '  ' + label),
      e(Text, {}, ' '.repeat(Math.max(1, 20 - label.length))),
      e(Text, {}, value),
      editHint
    );
  });

  var editHelp = onEdit
    ? e(Box, { marginTop: 1 }, e(Text, { dimColor: true }, '  Press 1-' + rows.length + ' to edit a field'))
    : null;

  return e(Box, { flexDirection: 'column', paddingTop: 1 },
    e(Box, { flexDirection: 'row' }, e(Text, { bold: true, color: 'white' }, '  Configuration Summary')),
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...rowElements),
    editHelp
  );
}

module.exports = { SummaryScreen };
