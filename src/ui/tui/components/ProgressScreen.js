'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
var { Spinner } = require('./Spinner');
var e = React.createElement;

var CHECK = '\u2713';
var CROSS = '\u2717';
var HOLLOW = '\u25CB';
var FILL = '\u2588';
var EMPTY = '\u2591';

function ProgressScreen(_a) {
  var phases = _a.phases;
  var currentPhase = _a.currentPhase;
  var message = _a.message;
  var completedPhases = _a.completedPhases;
  var filePath = _a.filePath;
  var fileCount = _a.fileCount;
  var fileTotal = _a.fileTotal;
  var failedCount = _a.failedCount;
  var onKey = _a.onKey;

  var { Text, Box } = getInk();

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
    var indicator;
    var label = phase.label || phase;

    if (comp[idx]) {
      indicator = e(Text, { color: 'green' }, '  ' + CHECK);
    } else if (idx < cur) {
      indicator = e(Text, { color: 'green' }, '  ' + CHECK);
    } else if (idx === cur) {
      indicator = e(Spinner, { color: 'cyan' });
    } else {
      indicator = e(Text, { color: 'gray' }, '  ' + HOLLOW);
    }

    var color = idx === cur ? 'cyan' : (idx < cur || comp[idx] ? 'green' : 'gray');
    return e(Box, { key: idx, flexDirection: 'row' },
      e(Box, { width: 4 }, indicator),
      e(Text, { color: color, dimColor: idx > cur && !comp[idx] }, label)
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
