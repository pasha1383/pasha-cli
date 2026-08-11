'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { hintsForContext } = require('../keymap');
const e = React.createElement;

function HelpOverlay({ context }) {
  const { Text, Box } = getInk();
  const hints = hintsForContext(context);

  const width = 52;
  const top = '\u250C' + '\u2500'.repeat(width - 2) + '\u2510';
  const bottom = '\u2514' + '\u2500'.repeat(width - 2) + '\u2518';
  const sep = '\u2502';

  const rows = [
    '',
    '  ' + 'pasha CLI — Key Bindings',
    '',
  ];

  for (const hint of hints) {
    const keyPad = hint.key.padEnd(10);
    rows.push('  ' + keyPad + '  ' + hint.label);
  }

  rows.push('');
  rows.push('  ' + 'Press Esc to close');

  const maxLen = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  const innerWidth = Math.max(width - 4, maxLen);

  const lineElements = rows.map(function (row, idx) {
    const padRight = Math.max(0, innerWidth - row.length);
    return e(Box, { key: idx, flexDirection: 'row' },
      e(Text, { color: 'cyan' }, sep),
      e(Text, { color: idx === 0 ? undefined : undefined, bold: idx === 2 }, row + ' '.repeat(padRight)),
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
