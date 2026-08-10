'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

function KeyHints({ hints }) {
  if (!hints || !hints.length) return null;

  const { Text, Box } = getInk();

  const items = hints.map((hint, i) => {
    const sep = i < hints.length - 1 ? ' \u00B7 ' : '';
    return e(React.Fragment, { key: hint.key },
      e(Text, { bold: true, color: 'white' }, hint.key),
      e(Text, { dimColor: true }, ' ' + hint.label + sep)
    );
  });

  return e(Box, { flexDirection: 'row', justifyContent: 'center', paddingTop: 1, paddingBottom: 0 }, ...items);
}

module.exports = { KeyHints };
