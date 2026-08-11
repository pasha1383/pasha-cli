'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { hintsForContext } = require('../keymap');
const e = React.createElement;

function HelpOverlay({ context }) {
  const { Text, Box } = getInk();
  const hints = hintsForContext(context) || [];
  const ctxLabel = context || 'wizard';

  const titleLine = '  pasha CLI — Key Bindings (' + ctxLabel + ')';

  var rows = ['', titleLine, ''];

  for (var i = 0; i < hints.length; i++) {
    var hint = hints[i];
    var keyPad = (hint.key || '').padEnd(10);
    rows.push('  ' + keyPad + '  ' + (hint.label || ''));
  }

  rows.push('');
  rows.push('  Press Esc to close');

  var maxLen = rows.reduce(function (max, r) { return Math.max(max, r.length); }, 0);
  var innerWidth = Math.max(44, maxLen);
  var width = innerWidth + 2;

  var top = '\u250C' + '\u2500'.repeat(width - 2) + '\u2510';
  var bottom = '\u2514' + '\u2500'.repeat(width - 2) + '\u2518';
  var sep = '\u2502';

  var lineElements = rows.map(function (row, idx) {
    var padRight = Math.max(0, innerWidth - row.length);
    return e(Box, { key: idx, flexDirection: 'row' },
      e(Text, { color: 'cyan' }, sep),
      e(Text, { bold: idx === 2 }, row + ' '.repeat(padRight)),
      e(Text, { color: 'cyan' }, sep)
    );
  });

  return e(Box, { flexDirection: 'column', marginTop: 1 },
    e(Text, { color: 'cyan' }, top),
    ...lineElements,
    e(Text, { color: 'cyan' }, bottom)
  );
}

module.exports = { HelpOverlay };
