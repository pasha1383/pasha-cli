'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

function KeyHints({ hints, compact }) {
  if (!hints || !hints.length) return null;

  const { Text, Box } = getInk();

  var essentialLabels = ['Select', 'Confirm', 'Submit', 'Quit', 'Exit', 'Start',
    'Back', 'Close', 'Cancel', 'Continue', 'Toggle', 'Toggle all'];

  var source = compact
    ? hints.filter(function (h) { return essentialLabels.indexOf(h.label) >= 0; }).slice(0, 6)
    : hints;

  if (!source.length) source = hints.slice(0, 4);

  let cols = 80;
  try {
    var ink = getInk();
    if (ink.useStdout) {
      var _stdout = ink.useStdout();
      cols = (_stdout && _stdout.stdout && _stdout.stdout.columns) || 80;
    }
  } catch (_) {
    cols = 80;
  }

  const SEP = ' \u00B7 ';
  var fit = [];
  var used = 0;

  for (var i = 0; i < source.length; i++) {
    var h = source[i];
    var w = h.key.length + 1 + h.label.length;
    var need = w + (fit.length ? SEP.length : 0);
    if (used + need > cols) break;
    used += need;
    fit.push(h);
  }

  if (!fit.length) return null;

  var children = [];
  for (var j = 0; j < fit.length; j++) {
    if (j > 0) children.push(e(Text, { key: 's-' + j, dimColor: true, color: 'gray' }, SEP));
    children.push(e(Text, { key: 'k-' + j, bold: true, color: 'white' }, fit[j].key));
    children.push(e(Text, { key: 'l-' + j, dimColor: true, color: 'gray' }, ' ' + fit[j].label));
  }

  var cols2 = Math.min(cols, 120);
  var topBorder = '\u251C' + '\u2500'.repeat(Math.max(0, cols2 - 2)) + '\u2524';

  return e(Box, { flexDirection: 'column' },
    e(Box, { flexDirection: 'row' },
      e(Text, { color: 'gray' }, topBorder)
    ),
    e(Box, { flexDirection: 'row', justifyContent: 'center', paddingTop: 1, paddingBottom: 0 }, ...children)
  );
}

module.exports = { KeyHints };
