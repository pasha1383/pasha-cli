'use strict';

const React = require('react');
const { getInk, getInkSpinner } = require('../ink-proxy');
const e = React.createElement;

function ProgressScreen({ phases, currentPhase, message }) {
  const { Text, Box } = getInk();
  const { default: Spinner } = getInkSpinner();
  var ph = phases || [];
  var cur = currentPhase !== undefined ? currentPhase : -1;
  var msg = message || '';

  var phaseElements = ph.map(function (phase, idx) {
    var status;
    if (idx < cur) status = { text: '\u2713', color: 'green', animate: false };
    else if (idx === cur) status = { text: '*', color: 'cyan', animate: true };
    else status = { text: '\u25CB', color: 'gray', animate: false };

    var indicator = status.animate
      ? e(Spinner, { type: 'dots' })
      : e(Text, {}, '  ' + status.text);

    return e(Box, { key: idx, flexDirection: 'row' },
      e(Text, { color: status.color }, null, indicator),
      e(Text, { color: status.color, dimColor: idx > cur }, ' ' + (phase.label || phase))
    );
  });

  var msgEl = msg ? e(Box, { marginTop: 1 }, e(Text, { dimColor: true }, msg)) : null;

  return e(Box, { flexDirection: 'column', paddingTop: 2 },
    e(Text, { bold: true, color: 'white' }, 'Generating project...'),
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...phaseElements),
    msgEl
  );
}

module.exports = { ProgressScreen };
