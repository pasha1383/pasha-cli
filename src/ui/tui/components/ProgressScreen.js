'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { Spinner } = require('./Spinner');
const e = React.createElement;

const CHECK = '\u2713';
const CROSS = '\u2717';
const HOLLOW = '\u25CB';
const FILL = '\u2588';
const EMPTY = '\u2591';

function ProgressScreen({ phases, currentPhase, message, completedPhases, filePath, fileCount, fileTotal, failedCount }) {
  const { Text, Box } = getInk();

  var ph = phases || [];
  var cur = currentPhase !== undefined ? currentPhase : -1;
  var msg = message || '';
  var comp = completedPhases || {};
  var fp = filePath || null;
  var done = fileCount !== undefined ? fileCount : 0;
  var total = fileTotal !== undefined ? fileTotal : 0;
  var failed = failedCount || 0;

  var known = total > 0;
  var pct = known ? Math.min(100, Math.round((done / total) * 100)) : 0;
  var barWidth = 30;
  var filled = known ? Math.round((done / total) * barWidth) : 0;
  var bar = known
    ? FILL.repeat(filled) + EMPTY.repeat(Math.max(0, barWidth - filled))
    : null;
  var pctText = known ? ' ' + pct + '%' : '';

  var phaseElements = ph.map(function (phase, idx) {
    var status;
    var indicator;
    var label = phase.label || phase;

    if (comp[idx]) {
      status = { text: CHECK, color: 'green' };
      indicator = e(Text, { color: 'green' }, '  ' + CHECK);
    } else if (idx < cur) {
      status = { text: CHECK, color: 'green' };
      indicator = e(Text, { color: 'green' }, '  ' + CHECK);
    } else if (idx === cur) {
      status = { text: '*', color: 'cyan' };
      indicator = e(Spinner, { color: 'cyan' });
    } else {
      status = { text: HOLLOW, color: 'gray' };
      indicator = e(Text, { color: 'gray' }, '  ' + HOLLOW);
    }

    return e(Box, { key: idx, flexDirection: 'row' },
      e(Box, { width: 4 }, indicator),
      e(Text, { color: status.color, dimColor: idx > cur }, label)
    );
  });

  var barEl = null;
  if (known && cur >= 0) {
    barEl = e(Box, { flexDirection: 'row', marginTop: 1 },
      e(Text, { color: 'cyan', bold: true }, '['),
      e(Text, { color: 'cyan' }, bar),
      e(Text, { color: 'cyan', bold: true }, ']'),
      e(Text, { color: 'white' }, pctText)
    );
  }

  var fileEl = fp ? e(Box, { marginTop: 0 },
    e(Text, { dimColor: true }, '  \u2514 ' + fp)
  ) : null;

  var countEl = known ? e(Box, { marginTop: 0 },
    e(Text, { dimColor: true }, '  ' + done + '/' + total + ' files' + (failed > 0 ? ' (' + failed + ' failed)' : ''))
  ) : null;

  var msgEl = msg ? e(Box, { marginTop: 1 },
    e(Text, { dimColor: true }, msg)
  ) : null;

  return e(Box, { flexDirection: 'column', paddingTop: 2 },
    e(Text, { bold: true, color: 'white' }, 'Generating project...'),
    barEl,
    countEl,
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...phaseElements),
    fileEl,
    msgEl
  );
}

module.exports = { ProgressScreen };
