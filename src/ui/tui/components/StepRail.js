'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation } = require('../hooks/useAnimation');
const e = React.createElement;

const COMPLETED = '\u25CF';
const ACTIVE = '\u25CB';
const ACTIVE_FILLED = '\u25CF';

function _easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function StepRail({ steps, currentIndex, width }) {
  const { Text, Box } = getInk();
  const maxWidth = width || 80;
  const usable = maxWidth - 4;
  const stepSlots = steps.length;
  const slotWidth = Math.floor(usable / stepSlots);
  const padding = Math.max(0, Math.floor((maxWidth - stepSlots * slotWidth - 2) / 2));

  const animate = useAnimation({ fps: 30 });
  const prevIndexRef = React.useRef(currentIndex);
  const transitionRef = React.useRef({ from: currentIndex, t: 0, startFrame: 0 });
  const DURATION_FRAMES = 12;

  React.useEffect(function () {
    if (prevIndexRef.current !== currentIndex) {
      transitionRef.current = {
        from: prevIndexRef.current,
        t: 0,
        startFrame: animate.frame,
      };
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

  if (animate.running && transitionRef.current.t < 1) {
    var elapsed = animate.frame - transitionRef.current.startFrame;
    var duration = animate.enabled ? DURATION_FRAMES : 1;
    transitionRef.current.t = Math.min(1, elapsed / duration);
  }

  var animT = transitionRef.current.t;
  var fromIdx = transitionRef.current.from;
  var displayIdx = currentIndex;

  var eased = _easeOutCubic(animT);

  var items = steps.map(function (step, idx) {
    var isCompleted = idx < currentIndex;
    var isActive = idx === currentIndex;

    var color = 'gray';
    if (isCompleted) color = 'green';
    else if (isActive) color = 'cyan';

    var marker = isCompleted ? COMPLETED : ACTIVE;
    var segment = '\u2501'.repeat(Math.max(0, slotWidth - 4));
    var label = step.label || step.name || '?';
    var shortLabel = label.length > slotWidth - 4 ? label.slice(0, slotWidth - 5) + '.' : label;

    var highlight = false;
    if (animate.enabled && animT < 1) {
      if (idx === currentIndex && fromIdx < currentIndex) {
        var pulse = Math.sin(eased * Math.PI * 2);
        var brightness = 0.5 + 0.5 * Math.abs(pulse);
        highlight = true;
        return e(React.Fragment, { key: step.name },
          e(Text, { color: 'cyan', bold: brightness > 0.8 }, marker + segment),
          e(Text, { color: 'yellow', bold: brightness > 0.8 }, shortLabel)
        );
      }
      if (idx === fromIdx) {
        var fadeOut = 1 - eased;
        var dimmed = fadeOut < 0.5;
        return e(React.Fragment, { key: step.name },
          e(Text, { color: dimmed ? 'gray' : 'green' }, COMPLETED + segment),
          e(Text, { color: dimmed ? 'gray' : 'green', dimColor: dimmed }, shortLabel)
        );
      }
    }

    return e(React.Fragment, { key: step.name },
      e(Text, { color }, marker + segment),
      e(Text, { dimColor: !isActive && !isCompleted, color: isActive ? 'yellow' : (isCompleted ? 'green' : 'gray') }, shortLabel)
    );
  });

  return e(Box, { flexDirection: 'row', paddingLeft: padding, paddingRight: 1, width: maxWidth }, ...items);
}

module.exports = { StepRail };
