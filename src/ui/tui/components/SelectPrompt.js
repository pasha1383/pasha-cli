'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation, isAnimationEnabled } = require('../hooks/useAnimation');
const e = React.createElement;

const ARROW = '\u276F';

function SelectPrompt({ message, choices, selectedIndex, filter, onSelect, onHighlight, onChange }) {
  const { Text, Box, useInput } = getInk();
  const allChoices = choices || [];
  const [highlighted, setHighlighted] = React.useState(selectedIndex || 0);
  const prevHighlightRef = React.useRef(highlighted);
  const transitionRef = React.useRef({ from: 0, startFrame: 0 });
  const anim = useAnimation({ fps: 30 });
  const enabled = isAnimationEnabled();

  React.useEffect(function () {
    if (prevHighlightRef.current !== highlighted) {
      transitionRef.current = {
        from: prevHighlightRef.current,
        startFrame: anim.frame,
      };
      prevHighlightRef.current = highlighted;
    }
  }, [highlighted]);

  const filtered = allChoices.filter(function (c) {
    if (!filter) return true;
    var label = (c.name || c.label || c.value || '').toLowerCase();
    return label.includes(filter.toLowerCase());
  });

  const maxIdx = Math.max(0, filtered.length - 1);
  const clampedHighlight = Math.min(highlighted, maxIdx);

  React.useEffect(function () {
    if (onHighlight) onHighlight(clampedHighlight, filtered);
  }, [clampedHighlight]);

  useInput(function (input, key) {
    if (key.upArrow || input === 'k') {
      setHighlighted(Math.max(0, clampedHighlight - 1));
    } else if (key.downArrow || input === 'j') {
      setHighlighted(Math.min(filtered.length - 1, clampedHighlight + 1));
    } else if (key.return) {
      if (onSelect && filtered[clampedHighlight]) {
        onSelect(filtered[clampedHighlight]);
      }
    } else if (onChange) {
      onChange(input, key);
    }
  });

  if (filtered.length === 0) {
    return e(Box, { flexDirection: 'column', paddingTop: 1 },
      e(Text, { bold: true, color: 'yellow' }, message),
      e(Box, { flexDirection: 'column', marginTop: 1 },
        e(Text, { dimColor: true }, 'No matches found.')
      )
    );
  }

  var fadeDuration = 8;
  var transitionT = 1;
  var transitionFrom = clampedHighlight;
  if (enabled && transitionRef.current.startFrame > 0) {
    var elapsed = anim.frame - transitionRef.current.startFrame;
    transitionT = Math.min(1, elapsed / fadeDuration);
    transitionFrom = transitionRef.current.from;
  }

  var filterEl = filter ? e(Text, { dimColor: true, color: 'gray' }, 'Filter: ' + filter) : null;

  var choiceElements = filtered.map(function (choice, idx) {
    var isHighlighted = idx === clampedHighlight;
    var wasHighlighted = idx === transitionFrom;
    var label = choice.name || choice.label || choice.value || '?';
    var desc = choice.description;

    var highlightBright = 1;
    if (enabled && transitionT < 1) {
      if (isHighlighted) {
        highlightBright = transitionT;
      } else if (wasHighlighted) {
        highlightBright = 1 - transitionT;
      } else {
        highlightBright = 0;
      }
    }

    var hasHighlight = isHighlighted || (wasHighlighted && transitionT < 1);
    var fadedHighlight = !isHighlighted && wasHighlighted && transitionT < 1;
    var arrowChar = hasHighlight ? ARROW : ' ';
    var arrowColor = hasHighlight ? (fadedHighlight ? undefined : 'cyan') : undefined;
    var arrowBold = isHighlighted;
    var textColor = hasHighlight ? (fadedHighlight ? undefined : 'cyan') : undefined;
    var textBold = isHighlighted;

    return e(Box, { key: choice.value || idx, flexDirection: 'row' },
      e(Text, { color: arrowColor, bold: arrowBold },
        arrowChar + ' ' + label
      ),
      desc ? e(Text, { dimColor: true }, '  ' + desc) : null
    );
  });

  return e(Box, { flexDirection: 'column', paddingTop: 1 },
    e(Text, { bold: true, color: 'yellow' }, message),
    filterEl,
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...choiceElements)
  );
}

module.exports = { SelectPrompt };
