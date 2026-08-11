'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
var { Spinner } = require('./Spinner');
var e = React.createElement;

var CHECK = '\u2713';
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
  var exactFilled = known ? (done / Math.max(1, total)) * barWidth : 0;
  var filled = Math.floor(exactFilled);
  var frac = exactFilled - filled;
  var partialBlock = frac >= 0.3 && filled < barWidth;
  var remaining = barWidth - filled - (partialBlock ? 1 : 0);

  var bar = known
    ? FILL.repeat(filled) + (partialBlock ? '\u2593' : '') + EMPTY.repeat(Math.max(0, remaining))
    : null;

  var pctText = known ? ' ' + pct + '%' : '';
  var fileProgress = known ? done + '/' + total + ' files' : '';
  if (failed > 0) fileProgress += '  ' + failed + ' failed';

  var phaseElements = ph.map(function (phase, idx) {
    var label = phase.label || phase;

    if (comp[idx]) {
      return e(Box, { key: idx, flexDirection: 'row' },
        e(Text, { color: 'green' }, '  ' + CHECK + ' '),
        e(Text, { color: 'green' }, label)
      );
    }

    if (idx < cur) {
      return e(Box, { key: idx, flexDirection: 'row' },
        e(Text, { color: 'green' }, '  ' + CHECK + ' '),
        e(Text, { color: 'green' }, label)
      );
    }

    if (idx === cur) {
      return e(Box, { key: idx, flexDirection: 'row' },
        e(Text, { color: 'cyan' }, '  '),
        e(Spinner, { color: 'cyan' }),
        e(Text, { color: 'cyan', bold: true }, ' ' + label)
      );
    }

    return e(Box, { key: idx, flexDirection: 'row' },
      e(Text, { color: 'gray', dimColor: true }, '  ' + HOLLOW + ' '),
      e(Text, { color: 'gray', dimColor: true }, label)
    );
  });

  var barEl = null;
  if (known && cur >= 0) {
    barEl = e(Box, { flexDirection: 'column', marginTop: 0 },
      e(Box, { flexDirection: 'row' },
        e(Text, { color: 'cyan' }, '  ['),
        e(Text, { color: 'cyan' }, bar),
        e(Text, { color: 'cyan' }, ']'),
        e(Text, { bold: true, color: 'white' }, pctText)
      ),
      e(Text, { dimColor: true, color: 'gray' }, '  ' + fileProgress)
    );
  }

  var fileEl = fp && !known ? e(Box, { marginTop: 0 },
    e(Text, { dimColor: true, color: 'gray' }, '  \u2514 ' + fp)
  ) : null;

  var msgEl = msg ? e(Box, { marginTop: 1 },
    e(Text, { dimColor: true }, '  ' + msg)
  ) : null;

  return e(Box, { flexDirection: 'column', paddingTop: 2 },
    e(Box, { flexDirection: 'row' },
      e(Text, { bold: true, color: 'white' }, '  Generating project'),
      cur >= 0 && ph[cur] ? e(Text, { dimColor: true, color: 'gray' }, '  \u00B7  ' + (ph[cur].label || ph[cur])) : null
    ),
    barEl,
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...phaseElements),
    fileEl,
    msgEl
  );
}

module.exports = { ProgressScreen };
