'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { theme } = require('../theme');
const e = React.createElement;

const COMPLETED = '✓';
const ACTIVE = '●';
const PENDING = '○';
const CONNECTOR = '━';

// Below this width, the full per-step rail can't fit without truncating
// labels down to nothing useful -- fall back to a compact "current step
// name + progress dots" summary instead, so narrow terminals still show
// where the user is without wrapping or overflowing.
const TINY_WIDTH = 46;

function StepRail({ steps, currentIndex, width, compact }) {
  const { Text, Box } = getInk();
  const allSteps = steps || [];
  const idx = currentIndex || 0;
  const maxWidth = width || 80;
  const stepCount = allSteps.length;

  if (stepCount === 0) return null;

  const counter = `${idx + 1}/${stepCount}`;

  if (maxWidth < TINY_WIDTH) {
    const current = allSteps[idx] || {};
    const label = current.label || current.name || '?';
    const dots = allSteps.map(function (_s, i) {
      const ch = i < idx ? COMPLETED : (i === idx ? ACTIVE : PENDING);
      const color = i < idx ? theme.success : (i === idx ? theme.primary : theme.muted);
      return e(Text, { key: i, color: color, dimColor: i > idx }, ch);
    });
    return e(Box, { flexDirection: 'column' },
      e(Box, { flexDirection: 'row' },
        e(Text, { bold: true, color: theme.primary }, label),
        e(Text, { dimColor: true, color: theme.muted }, ' ' + counter)
      ),
      e(Box, { flexDirection: 'row' }, ...dots)
    );
  }

  const counterWidth = counter.length + 1;

  var labelLen = Math.max(1, Math.floor((maxWidth - counterWidth - 5 * stepCount + 1) / stepCount));
  if (compact) labelLen = Math.min(labelLen, 3);

  var items = [];

  for (var i = 0; i < stepCount; i++) {
    var step = allSteps[i];
    var isCompleted = i < idx;
    var isActive = i === idx;
    var isFuture = i > idx;
    var isLast = i === stepCount - 1;

    var color = theme.muted;
    if (isCompleted) color = theme.success;
    else if (isActive) color = theme.primary;

    var marker = isFuture ? PENDING : (isCompleted ? COMPLETED : ACTIVE);
    var rawLabel = step.label || step.name || '?';
    var numStr = String(i + 1) + '.';

    var label;
    if (compact) {
      label = rawLabel.slice(0, 3);
    } else if (rawLabel.length > labelLen) {
      label = rawLabel.slice(0, labelLen);
    } else {
      label = rawLabel;
    }
    label = label.padEnd(labelLen);

    items.push(
      e(Text, { key: step.name || i, color: color, bold: isActive, dimColor: isFuture },
        marker + ' ' + numStr + ' ' + label + ' ')
    );

    if (!isLast) {
      var nextIsFuture = i + 1 > idx;
      var connectorChar = (nextIsFuture && !isActive) ? ' ' : CONNECTOR;
      var connectorColor = isCompleted ? theme.success : (isActive ? theme.primary : theme.muted);
      items.push(
        e(Text, { key: 'c-' + i, color: connectorColor, dimColor: nextIsFuture }, connectorChar)
      );
    }
  }

  items.push(
    e(Text, { key: 'counter', color: theme.muted, dimColor: true }, ' ' + counter)
  );

  return e(Box, { flexDirection: 'row', width: maxWidth }, ...items);
}

module.exports = { StepRail };
