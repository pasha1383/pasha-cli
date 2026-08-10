'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

const ARROW = '\u276F';

function SelectPrompt({ message, choices, selectedIndex, filter, onSelect, onHighlight, onChange }) {
  const { Text, Box, useInput } = getInk();
  const allChoices = choices || [];
  const [highlighted, setHighlighted] = React.useState(selectedIndex || 0);

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

  var filterEl = filter ? e(Text, { dimColor: true, color: 'gray' }, 'Filter: ' + filter) : null;

  var choiceElements = filtered.map(function (choice, idx) {
    var isHighlighted = idx === clampedHighlight;
    var label = choice.name || choice.label || choice.value || '?';
    var desc = choice.description;

    return e(Box, { key: choice.value || idx, flexDirection: 'row' },
      e(Text, { color: isHighlighted ? 'cyan' : undefined, bold: isHighlighted },
        (isHighlighted ? ARROW + ' ' : '  ') + label
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
