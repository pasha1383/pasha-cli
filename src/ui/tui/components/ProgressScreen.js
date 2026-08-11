'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
var { Spinner } = require('./Spinner');
var e = React.createElement;

var CHECK = '\u2713';
var HOLLOW = '\u25CB';
var FILL = '\u2588';
var UNFILLED = '\u2593';

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
  var filled = known ? Math.round((done / Math.max(1, total)) * barWidth) : 0;
  var remaining = barWidth - filled;

  var bar = known
    ? FILL.repeat(filled) + UNFILLED.repeat(Math.max(0, remaining))
    : null;

  var pctText = known ? ' ' + pct + '%' : '';
  var fileProgress = known ? '(' + done + '/' + total + ' files)' : '';
  if (failed > 0) fileProgress += '  ' + failed + ' failed';

  var phaseElements = ph.map(function (phase, idx) {
    var label = phase.label || phase;

    if (comp[idx] || idx < cur) {
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
    barEl = e(Box, { flexDirection: 'column', marginTop: 1 },
      e(Box, { flexDirection: 'row' },
        e(Text, { color: 'gray' }, '  ['),
        e(Text, { color: 'cyan' }, bar.slice(0, filled)),
        e(Text, { color: 'gray' }, bar.slice(filled)),
        e(Text, { color: 'gray' }, ']'),
        e(Text, { bold: true, color: 'white' }, pctText)
      ),
      e(Text, { dimColor: true, color: 'gray' }, '  ' + fileProgress)
    );
  }

  var spinnerBarEl = null;
  if (!known && cur >= 0) {
    spinnerBarEl = e(Box, { flexDirection: 'row', marginTop: 1 },
      e(Text, { color: 'cyan' }, '  '),
      e(Spinner, { color: 'cyan' })
    );
  }

  var fileEl = fp ? e(Box, { marginTop: 1 },
    e(Text, { dimColor: true, color: 'gray' }, '  \u2514 ' + fp)
  ) : null;

  var msgEl = msg ? e(Box, { marginTop: 1 },
    e(Text, { dimColor: true }, '  ' + msg)
  ) : null;

  return e(Box, { flexDirection: 'column', paddingTop: 2 },
    e(Box, { flexDirection: 'row' },
      e(Text, { bold: true, color: 'white' }, '  Generating project...')
    ),
    barEl,
    spinnerBarEl,
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...phaseElements),
    fileEl,
    msgEl
  );
}

module.exports = { ProgressScreen };
