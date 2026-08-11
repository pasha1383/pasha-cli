'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation, isAnimationEnabled } = require('../hooks/useAnimation');
const e = React.createElement;

const COMPLETED = '\u25CF';
const PENDING = '\u25CB';
const CONNECTOR = '\u2501';

function StepRail({ steps, currentIndex, width, compact }) {
  const { Text, Box } = getInk();
  const allSteps = steps || [];
  const idx = currentIndex || 0;
  const maxWidth = width || 80;
  const usable = maxWidth - 4;
  const stepCount = allSteps.length || 1;
  const slotWidth = Math.max(9, Math.floor(usable / stepCount));
  const padding = Math.max(0, Math.floor((maxWidth - stepCount * slotWidth - 2) / 2));

  const animate = useAnimation({ fps: 30 });
  const enabled = isAnimationEnabled();

  if (allSteps.length === 0) return null;

  var items = allSteps.map(function (step, i) {
    var isCompleted = i < idx;
    var isActive = i === idx;
    var isPending = i > idx;

    var color = 'gray';
    if (isCompleted) color = 'green';
    else if (isActive) color = 'cyan';

    var marker = isCompleted ? COMPLETED : (isActive ? COMPLETED : PENDING);
    var connectorLen = Math.max(1, slotWidth - 7);
    var label = step.label || step.name || '?';
    var shortLabel;
    if (compact) {
      shortLabel = label.length > 3 ? label.slice(0, 3) : label;
    } else {
      shortLabel = label.length > slotWidth - 5 ? label.slice(0, slotWidth - 6) : label;
    }

    return e(React.Fragment, { key: step.name || i },
      e(Text, { color: color, bold: isActive }, marker),
      e(Text, { color: color, dimColor: isPending }, ' ' + shortLabel + ' '),
      e(Text, { color: 'gray', dimColor: true }, CONNECTOR.repeat(connectorLen))
    );
  });

  return e(Box, { flexDirection: 'row', paddingLeft: padding, paddingRight: 1, width: maxWidth }, ...items);
}

module.exports = { StepRail };
