'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

const COMPLETED = '\u2713';
const ACTIVE = '\u25CF';
const PENDING = '\u25CB';
const CONNECTOR = '\u2501';

function StepRail({ steps, currentIndex, width, compact }) {
  const { Text, Box } = getInk();
  const allSteps = steps || [];
  const idx = currentIndex || 0;
  const maxWidth = width || 80;
  const stepCount = allSteps.length;

  if (stepCount === 0) return null;

  const counter = `${idx + 1}/${stepCount}`;
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

    var color = 'gray';
    if (isCompleted) color = 'green';
    else if (isActive) color = 'cyan';

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
      var connectorColor = isCompleted ? 'green' : (isActive ? 'cyan' : 'gray');
      items.push(
        e(Text, { key: 'c-' + i, color: connectorColor, dimColor: nextIsFuture }, connectorChar)
      );
    }
  }

  items.push(
    e(Text, { key: 'counter', color: 'gray', dimColor: true }, ' ' + counter)
  );

  return e(Box, { flexDirection: 'row', width: maxWidth }, ...items);
}

module.exports = { StepRail };
