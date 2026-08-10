'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

var CHECKBOX_ON = '\u25C9';
var CHECKBOX_OFF = '\u25CB';

function MultiSelectPrompt({ message, choices, initialChecked, onConfirm, filter, onChange }) {
  const { Text, Box, useInput } = getInk();
  var allChoices = choices || [];
  var [checked, setChecked] = React.useState(function () {
    return new Set(initialChecked || []);
  });
  var [highlighted, setHighlighted] = React.useState(0);

  var filtered = allChoices.filter(function (c) {
    if (!filter) return true;
    var label = (c.name || c.label || c.value || '').toLowerCase();
    return label.includes(filter.toLowerCase());
  });

  var maxIdx = Math.max(0, filtered.length - 1);
  var clampedHighlight = Math.min(highlighted, maxIdx);

  useInput(function (input, key) {
    if (key.upArrow || input === 'k') {
      setHighlighted(Math.max(0, clampedHighlight - 1));
    } else if (key.downArrow || input === 'j') {
      setHighlighted(Math.min(filtered.length - 1, clampedHighlight + 1));
    } else if (input === ' ') {
      var item = filtered[clampedHighlight];
      if (item) {
        setChecked(function (prev) {
          var next = new Set(prev);
          if (next.has(item.value)) next.delete(item.value);
          else next.add(item.value);
          return next;
        });
      }
    } else if (input === 'a') {
      setChecked(new Set(filtered.map(function (c) { return c.value; })));
    } else if (input === 'n') {
      setChecked(new Set());
    } else if (key.return) {
      if (onConfirm) {
        var result = allChoices
          .filter(function (c) { return checked.has(c.value); })
          .map(function (c) { return c.value; });
        onConfirm(result);
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
    var isChecked = checked.has(choice.value);
    var label = choice.name || choice.label || choice.value || '?';

    return e(Box, { key: choice.value || idx, flexDirection: 'row' },
      e(Text, { color: isChecked ? 'green' : 'gray' }, isChecked ? CHECKBOX_ON : CHECKBOX_OFF),
      e(Text, { color: isHighlighted ? 'cyan' : undefined, bold: isHighlighted }, ' ' + label)
    );
  });

  return e(Box, { flexDirection: 'column', paddingTop: 1 },
    e(Text, { bold: true, color: 'yellow' }, message),
    e(Text, { dimColor: true }, '(space to toggle, a to select all, n to deselect all, enter to confirm)'),
    filterEl,
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...choiceElements)
  );
}

module.exports = { MultiSelectPrompt };
