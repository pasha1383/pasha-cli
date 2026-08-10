'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

const COMPLETED = '\u25CF';
const ACTIVE = '\u25CB';

function StepRail({ steps, currentIndex, width }) {
  const { Text, Box } = getInk();
  const maxWidth = width || 80;
  const usable = maxWidth - 4;
  const stepSlots = steps.length;
  const slotWidth = Math.floor(usable / stepSlots);
  const padding = Math.max(0, Math.floor((maxWidth - stepSlots * slotWidth - 2) / 2));

  const items = steps.map((step, idx) => {
    const isCompleted = idx < currentIndex;
    const isActive = idx === currentIndex;

    let color = 'gray';
    if (isCompleted) color = 'green';
    else if (isActive) color = 'cyan';

    const marker = isCompleted ? COMPLETED : ACTIVE;
    const segment = '\u2501'.repeat(Math.max(0, slotWidth - 4));
    const label = step.label || step.name || '?';
    const shortLabel = label.length > slotWidth - 4 ? label.slice(0, slotWidth - 5) + '.' : label;

    return e(React.Fragment, { key: step.name },
      e(Text, { color }, marker + segment),
      e(Text, { dimColor: !isActive && !isCompleted, color: isActive ? 'yellow' : (isCompleted ? 'green' : 'gray') }, shortLabel)
    );
  });

  return e(Box, { flexDirection: 'row', paddingLeft: padding, paddingRight: 1, width: maxWidth }, ...items);
}

module.exports = { StepRail };
