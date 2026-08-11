'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
var e = React.createElement;

var CHECKBOX_ON = '\u25C9';
var CHECKBOX_OFF = '\u25CB';

function MultiSelectPrompt(_a) {
  var message = _a.message;
  var choices = _a.choices;
  var initialChecked = _a.initialChecked;
  var onConfirm = _a.onConfirm;
  var onKey = _a.onKey;

  var { Text, Box, useInput } = getInk();
  var allChoices = choices || [];
  var _b = React.useState(function () {
    return new Set(initialChecked || []);
  });
  var checked = _b[0];
  var setChecked = _b[1];
  var _c = React.useState(0);
  var highlighted = _c[0];
  var setHighlighted = _c[1];
  var _d = React.useState('');
  var filter = _d[0];
  var setFilter = _d[1];

  var filtered = allChoices.filter(function (c) {
    if (!filter) return true;
    var label = (c.name || c.label || c.value || '').toLowerCase();
    var f = filter.toLowerCase();
    if (label.includes(f)) return true;
    var desc = (c.description || '').toLowerCase();
    return desc.includes(f);
  });

  var maxIdx = Math.max(0, filtered.length - 1);
  var clampedHighlight = Math.min(highlighted, maxIdx);

  useInput(function (input, key) {
    if (key.name === 'escape') {
      setFilter('');
      if (onKey) onKey(input, key);
      return;
    }
    if (key.name === 'backspace' || key.name === 'delete') {
      if (filter.length > 0) {
        setFilter(function (prev) { return prev.slice(0, -1); });
        setHighlighted(0);
      } else {
        if (onKey) onKey(input, key);
      }
      return;
    }
    if (key.name === 'upArrow' || input === 'k') {
      setHighlighted(Math.max(0, clampedHighlight - 1));
      return;
    }
    if (key.name === 'downArrow' || input === 'j') {
      setHighlighted(Math.min(maxIdx, clampedHighlight + 1));
      return;
    }
    if (input === ' ') {
      var item = filtered[clampedHighlight];
      if (item) {
        setChecked(function (prev) {
          var next = new Set(prev);
          if (next.has(item.value)) next.delete(item.value);
          else next.add(item.value);
          return next;
        });
      }
      return;
    }
    if (input === 'a') {
      setChecked(new Set(filtered.map(function (c) { return c.value; })));
      return;
    }
    if (input === 'n') {
      setChecked(new Set());
      return;
    }
    if (key.name === 'return') {
      if (onConfirm) {
        var result = allChoices
          .filter(function (c) { return checked.has(c.value); })
          .map(function (c) { return c.value; });
        onConfirm(result);
      }
      return;
    }
    if (key.name === 'leftArrow') {
      if (onKey) onKey(input, key);
      return;
    }
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setFilter(function (prev) { return prev + input; });
      setHighlighted(0);
      return;
    }
    if (onKey) onKey(input, key);
  });

  var checkedCount = allChoices.filter(function (c) { return checked.has(c.value); }).length;
  var totalItems = filtered.length;
  var pos = totalItems > 0 ? clampedHighlight + 1 : 0;
  var scrollInfo = totalItems > 5 ? ' (' + pos + '/' + totalItems + ')' : '';

  if (filtered.length === 0) {
    return e(Box, { flexDirection: 'column', paddingTop: 1 },
      e(Text, { bold: true, color: 'yellow' }, message),
      filter ? e(Text, { color: 'gray' }, 'Filter: ' + filter + '  (Esc to clear)') : null,
      e(Box, { flexDirection: 'column', marginTop: 1 },
        e(Text, { dimColor: true }, 'No matches found.')
      )
    );
  }

  var filterEl = filter
    ? e(Text, { color: 'gray' }, 'Filter: ' + filter + '  (Esc to clear)')
    : null;

  var choiceElements = filtered.map(function (choice, idx) {
    var isHighlighted = idx === clampedHighlight;
    var isChecked = checked.has(choice.value);
    var label = choice.name || choice.label || choice.value || '?';
    var desc = choice.description;

    return e(Box, { key: choice.value || idx, flexDirection: 'row' },
      e(Text, { color: isChecked ? 'green' : 'gray' }, isChecked ? CHECKBOX_ON : CHECKBOX_OFF),
      e(Text, { color: isHighlighted ? 'cyan' : undefined, bold: isHighlighted }, ' ' + label),
      desc ? e(Text, { dimColor: true }, '  ' + desc) : null,
      isHighlighted && totalItems > 5 ? e(Text, { dimColor: true, color: 'gray' }, scrollInfo) : null
    );
  });

  return e(Box, { flexDirection: 'column', paddingTop: 1 },
    e(Box, { flexDirection: 'row' },
      e(Text, { bold: true, color: 'yellow' }, message),
      e(Text, { dimColor: true, color: 'gray' }, ' (' + checkedCount + ' selected')
    ),
    filterEl,
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...choiceElements)
  );
}

module.exports = { MultiSelectPrompt };
