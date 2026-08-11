'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation, isAnimationEnabled } = require('../hooks/useAnimation');
const e = React.createElement;

const COMPLETED = '\u25CF';
const ACTIVE = '\u25CB';
const ACTIVE_FILLED = '\u25CF';

function _easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function StepRail({ steps, currentIndex, width }) {
  const { Text, Box } = getInk();
  const allSteps = steps || [];
  const idx = currentIndex || 0;
  const maxWidth = width || 80;
  const usable = maxWidth - 4;
  const stepCount = allSteps.length || 1;
  const slotWidth = Math.max(8, Math.floor(usable / stepCount));
  const padding = Math.max(0, Math.floor((maxWidth - stepCount * slotWidth - 2) / 2));

  const animate = useAnimation({ fps: 30 });
  const enabled = isAnimationEnabled();

  if (allSteps.length === 0) return null;

  var items = allSteps.map(function (step, i) {
    var isCompleted = i < idx;
    var isActive = i === idx;
    var color = 'gray';
    if (isCompleted) color = 'green';
    else if (isActive) color = 'cyan';

    var marker = isCompleted ? COMPLETED : (isActive ? ACTIVE_FILLED : ACTIVE);
    var segment = '\u2501'.repeat(Math.max(1, slotWidth - 6));
    var label = step.label || step.name || '?';
    var shortLabel = label.length > slotWidth - 4 ? label.slice(0, slotWidth - 5) + '.' : label;

    return e(React.Fragment, { key: step.name || i },
      e(Text, { color: color, bold: isActive }, marker + segment + ' '),
      e(Text, { dimColor: !isActive && !isCompleted, color: color, bold: isActive }, shortLabel)
    );
  });

  return e(Box, { flexDirection: 'row', paddingLeft: padding, paddingRight: 1, width: maxWidth }, ...items);
}

module.exports = { StepRail };
