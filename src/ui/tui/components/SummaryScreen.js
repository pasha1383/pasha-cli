'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
var e = React.createElement;

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

function SummaryScreen(_a) {
  var context = _a.context;
  var onEdit = _a.onEdit;
  var onKey = _a.onKey;
  var onContinue = _a.onContinue;

  var { Text, Box, useInput } = getInk();
  var ctx = context || {};
  var rows = [];

  SUMMARY_KEYS.forEach(function (entry) {
    var label = entry[0];
    var key = entry[1];
    var val = ctx[key];
    if (val === undefined || val === null || val === '') return;
    rows.push([label, String(val), entry]);
  });

  Object.keys(EXTRA_LABELS).forEach(function (key) {
    if (ctx[key] !== undefined) {
      rows.push([EXTRA_LABELS[key], fmtBool(ctx[key]), [EXTRA_LABELS[key], key]]);
    }
  });

  var mods = ctx.modules;
  if (Array.isArray(mods) && mods.length) {
    rows.push(['Modules', String(mods.length) + ' (' + mods.join(', ') + ')', ['Modules', 'modules']]);
  }

  var _b = React.useState(0);
  var highlighted = _b[0];
  var setHighlighted = _b[1];

  useInput(function (input, key) {
    if (key.upArrow || input === 'k') {
      setHighlighted(Math.max(0, highlighted - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setHighlighted(Math.min(rows.length - 1, highlighted + 1));
      return;
    }
    if (key.return) {
      if (onContinue) onContinue();
      return;
    }
    if (input === 'e' && onEdit) {
      onEdit();
      return;
    }

    var num = parseInt(input, 10);
    if (!isNaN(num) && num >= 1 && num <= rows.length && onEdit) {
      if (typeof onEdit === 'function') {
        onEdit(num - 1);
      }
      return;
    }

    if (onKey) onKey(input, key);
  });

  var rowElements = rows.map(function (entry, idx) {
    var label = entry[0];
    var value = entry[1];
    var isHighlighted = idx === highlighted;
    var numLabel = rows.length > 1 ? (idx + 1) + '. ' : '  ';

    return e(Box, { key: idx, flexDirection: 'row' },
      e(Text, { dimColor: true, color: 'gray' }, '  ' + numLabel),
      e(Text, { bold: isHighlighted, color: isHighlighted ? 'white' : 'white' }, label),
      e(Text, { color: 'gray' }, ' '.repeat(Math.max(1, 22 - label.length))),
      e(Text, { color: isHighlighted ? 'cyan' : undefined }, value),
      isHighlighted && onEdit ? e(Text, { dimColor: true, color: 'cyan' }, '  [e edit]') : null
    );
  });

  var editHelp = onEdit
    ? e(Box, { marginTop: 1 }, e(Text, { dimColor: true, color: 'gray' }, '  Arrow keys to select, Enter to continue, e to edit, 1-' + rows.length + ' to jump'))
    : null;

  return e(Box, { flexDirection: 'column', paddingTop: 1 },
    e(Box, { flexDirection: 'row' },
      e(Text, { bold: true, color: 'white' }, '  Configuration Summary'),
      e(Text, { dimColor: true, color: 'gray' }, '  (' + rows.length + ' items)')
    ),
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...rowElements),
    editHelp
  );
}

module.exports = { SummaryScreen };
