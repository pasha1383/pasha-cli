'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
var { theme } = require('../theme');
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
  var failedText = failed > 0 ? '  ✗ ' + failed + ' failed' : '';

  var phaseElements = ph.map(function (phase, idx) {
    var label = phase.label || phase;

    if (comp[idx] || idx < cur) {
      return e(Box, { key: idx, flexDirection: 'row' },
        e(Text, { color: theme.success }, '  ' + CHECK + ' '),
        e(Text, { color: theme.success }, label)
      );
    }

    if (idx === cur) {
      return e(Box, { key: idx, flexDirection: 'row' },
        e(Text, { color: theme.primary }, '  '),
        e(Spinner, { color: theme.primary }),
        e(Text, { color: theme.primary, bold: true }, ' ' + label)
      );
    }

    return e(Box, { key: idx, flexDirection: 'row' },
      e(Text, { color: theme.muted, dimColor: true }, '  ' + HOLLOW + ' '),
      e(Text, { color: theme.muted, dimColor: true }, label)
    );
  });

  var barEl = null;
  if (known && cur >= 0) {
    barEl = e(Box, { flexDirection: 'column', marginTop: 1 },
      e(Box, { flexDirection: 'row' },
        e(Text, { color: theme.border }, '  ['),
        e(Text, { color: theme.primary }, bar.slice(0, filled)),
        e(Text, { color: theme.border }, bar.slice(filled)),
        e(Text, { color: theme.border }, ']'),
        e(Text, { bold: true, color: theme.text }, pctText)
      ),
      e(Box, { flexDirection: 'row' },
        e(Text, { dimColor: true, color: theme.muted }, '  ' + fileProgress),
        failed > 0 ? e(Text, { bold: true, color: theme.error }, failedText) : null
      )
    );
  }

  var spinnerBarEl = null;
  if (!known && cur >= 0) {
    spinnerBarEl = e(Box, { flexDirection: 'row', marginTop: 1 },
      e(Text, { color: theme.primary }, '  '),
      e(Spinner, { color: theme.primary })
    );
  }

  var fileEl = fp ? e(Box, { marginTop: 1 },
    e(Text, { dimColor: true, color: theme.muted }, '  \u2514 ' + fp)
  ) : null;

  var msgEl = msg ? e(Box, { marginTop: 1 },
    e(Text, { dimColor: true }, '  ' + msg)
  ) : null;

  return e(Box, { flexDirection: 'column', paddingTop: 2 },
    e(Box, { flexDirection: 'row' },
      e(Text, { bold: true, color: theme.text }, '  Generating project...')
    ),
    barEl,
    spinnerBarEl,
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...phaseElements),
    fileEl,
    msgEl
  );
}

module.exports = { ProgressScreen };
