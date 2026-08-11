'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
var e = React.createElement;

var ARROW = '\u276F';
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
  var _e = React.useState(false);
  var filterActive = _e[0];
  var setFilterActive = _e[1];

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
    if (key.upArrow || input === 'k') {
      setHighlighted(Math.max(0, clampedHighlight - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
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
    if (key.return) {
      if (onConfirm) {
        var result = allChoices
          .filter(function (c) { return checked.has(c.value); })
          .map(function (c) { return c.value; });
        onConfirm(result);
      }
      return;
    }
    if (key.leftArrow) {
      if (onKey) onKey(input, key);
      return;
    }

    if (filterActive) {
      if (key.escape) {
        setFilter('');
        setFilterActive(false);
        return;
      }
      if (key.backspace || key.delete) {
        setFilter(function (prev) { return prev.slice(0, -1); });
        setHighlighted(0);
        return;
      }
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        setFilter(function (prev) { return prev + input; });
        setHighlighted(0);
        return;
      }
      if (onKey) onKey(input, key);
      return;
    }

    if (key.escape || key.backspace) {
      if (onKey) onKey(input, key);
      return;
    }
    if (input === '/') {
      setFilterActive(true);
      return;
    }
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setFilterActive(true);
      setFilter(function (prev) { return prev + input; });
      setHighlighted(0);
      return;
    }
    if (onKey) onKey(input, key);
  });

  var checkedCount = allChoices.filter(function (c) { return checked.has(c.value); }).length;
  var totalAll = allChoices.length;
  var totalItems = filtered.length;
  var pos = totalItems > 0 ? clampedHighlight + 1 : 0;

  var filterEl = null;
  if (filter || filterActive) {
    filterEl = e(Box, { flexDirection: 'row' },
      e(Text, { color: 'yellow' }, '  Filter: '),
      e(Text, { color: 'white' }, filter),
      e(Text, { color: 'yellow' }, filterActive ? '_' : ''),
      e(Text, { dimColor: true, color: 'gray' }, '  (Esc to clear)')
    );
  }

  var headerSep = e(Box, { flexDirection: 'row' },
    e(Text, { color: 'gray' }, '  ' + '\u2500'.repeat(48))
  );

  var counterEl = e(Box, { flexDirection: 'row' },
    e(Text, { dimColor: true, color: 'gray' }, '  [' + checkedCount + '/' + totalAll + ' selected]')
  );

  var hintsEl = e(Box, { flexDirection: 'row' },
    e(Text, { dimColor: true, color: 'gray' }, '  Space=toggle, a=all, n=none, Enter=confirm')
  );

  if (filtered.length === 0) {
    return e(Box, { flexDirection: 'column', paddingTop: 1 },
      e(Text, { bold: true, color: 'white' }, message),
      filterEl,
      headerSep,
      e(Box, { flexDirection: 'column', marginTop: 1 },
        e(Text, { dimColor: true, color: 'gray' }, '  No matches found.')
      ),
      counterEl,
      hintsEl
    );
  }

  var choiceElements = filtered.map(function (choice, idx) {
    var isHighlighted = idx === clampedHighlight;
    var isChecked = checked.has(choice.value);
    var label = choice.name || choice.label || choice.value || '?';
    var desc = choice.description;

    var checkbox = isChecked ? CHECKBOX_ON : CHECKBOX_OFF;

    var rowChildren = [
      e(Text, { key: 'ptr', color: isHighlighted ? 'cyan' : undefined }, '  ' + (isHighlighted ? ARROW : ' ')),
      e(Text, { key: 'cb', color: isChecked ? 'green' : 'gray' }, ' ' + checkbox),
      e(Text, { key: 'label', color: 'white', bold: isHighlighted }, ' ' + label),
    ];

    if (desc) {
      rowChildren.push(e(Text, { key: 'desc', dimColor: true, color: 'gray' }, '  ' + desc));
    }

    return e(Box, { key: choice.value || idx, flexDirection: 'row' }, ...rowChildren);
  });

  var itemsChildren = [];

  if (filtered.length > 8) {
    var startIdx = Math.max(0, clampedHighlight - 4);
    var endIdx = Math.min(filtered.length, startIdx + 8);
    if (endIdx - startIdx < 8) {
      startIdx = Math.max(0, endIdx - 8);
    }
    var visible = filtered.slice(startIdx, endIdx);

    var scrollUp = startIdx > 0
      ? e(Box, { key: 'scroll-up', flexDirection: 'row' },
          e(Text, { dimColor: true, color: 'gray' }, '  \u2191 ' + startIdx + ' more')
        )
      : null;
    var scrollDown = endIdx < filtered.length
      ? e(Box, { key: 'scroll-down', flexDirection: 'row' },
          e(Text, { dimColor: true, color: 'gray' }, '  \u2193 ' + (filtered.length - endIdx) + ' more')
        )
      : null;

    if (scrollUp) itemsChildren.push(scrollUp);

    visible.forEach(function (choice, i) {
      var isHighlighted = (startIdx + i) === clampedHighlight;
      var isChecked = checked.has(choice.value);
      var label = choice.name || choice.label || choice.value || '?';
      var desc = choice.description;
      var checkbox = isChecked ? CHECKBOX_ON : CHECKBOX_OFF;

      var rowChildren = [
        e(Text, { key: 'ptr', color: isHighlighted ? 'cyan' : undefined }, '  ' + (isHighlighted ? ARROW : ' ')),
        e(Text, { key: 'cb', color: isChecked ? 'green' : 'gray' }, ' ' + checkbox),
        e(Text, { key: 'label', color: 'white', bold: isHighlighted }, ' ' + label),
      ];
      if (desc) {
        rowChildren.push(e(Text, { key: 'desc', dimColor: true, color: 'gray' }, '  ' + desc));
      }

      itemsChildren.push(e(Box, { key: choice.value || (startIdx + i), flexDirection: 'row' }, ...rowChildren));
    });

    if (scrollDown) itemsChildren.push(scrollDown);
  } else {
    itemsChildren = choiceElements;
  }

  return e(Box, { flexDirection: 'column', paddingTop: 1 },
    e(Text, { bold: true, color: 'white' }, message),
    filterEl,
    headerSep,
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...itemsChildren),
    counterEl,
    hintsEl
  );
}

module.exports = { MultiSelectPrompt };
