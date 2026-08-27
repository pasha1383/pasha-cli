'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
var { useAnimation, isAnimationEnabled } = require('../hooks/useAnimation');
var { theme } = require('../theme');
var e = React.createElement;

var ARROW = '\u276F';

function SelectPrompt(_a) {
  var message = _a.message;
  var choices = _a.choices;
  var selectedIndex = _a.selectedIndex;
  var onSelect = _a.onSelect;
  var onHighlight = _a.onHighlight;
  var onKey = _a.onKey;
  var compact = _a.compact;

  var { Text, Box, useInput } = getInk();
  var allChoices = choices || [];
  var _b = React.useState(selectedIndex || 0);
  var highlighted = _b[0];
  var setHighlighted = _b[1];
  var _c = React.useState('');
  var filter = _c[0];
  var setFilter = _c[1];
  var _d = React.useState(false);
  var filterActive = _d[0];
  var setFilterActive = _d[1];
  var prevHighlightRef = React.useRef(highlighted);
  var transitionRef = React.useRef({ from: 0, startFrame: 0 });
  var anim = useAnimation({ fps: 30 });
  var enabled = isAnimationEnabled();

  React.useEffect(function () {
    if (prevHighlightRef.current !== highlighted) {
      transitionRef.current = {
        from: prevHighlightRef.current,
        startFrame: anim.frame,
      };
      prevHighlightRef.current = highlighted;
    }
  }, [highlighted]);

  var filtered = allChoices.filter(function (c) {
    if (!filter) return true;
    var label = (c.name || c.label || c.value || '').toLowerCase();
    return label.includes(filter.toLowerCase());
  });

  var maxIdx = Math.max(0, filtered.length - 1);
  var clampedHighlight = Math.min(highlighted, maxIdx);

  React.useEffect(function () {
    if (onHighlight) onHighlight(clampedHighlight, filtered);
  }, [clampedHighlight]);

  useInput(function (input, key) {
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
      if (key.upArrow || input === 'k') {
        setHighlighted(Math.max(0, clampedHighlight - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setHighlighted(Math.min(maxIdx, clampedHighlight + 1));
        return;
      }
      if (key.return) {
        setFilterActive(false);
        if (onSelect && filtered[clampedHighlight]) {
          onSelect(filtered[clampedHighlight]);
        }
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

    if (key.upArrow || input === 'k') {
      setHighlighted(Math.max(0, clampedHighlight - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setHighlighted(Math.min(maxIdx, clampedHighlight + 1));
      return;
    }
    if (key.return) {
      if (onSelect && filtered[clampedHighlight]) {
        onSelect(filtered[clampedHighlight]);
      }
      return;
    }
    if (input === '/') {
      setFilterActive(true);
      return;
    }
    if (onKey) onKey(input, key);
  });

  if (filtered.length === 0) {
    return e(Box, { flexDirection: 'column', paddingTop: 1 },
      e(Text, { bold: true, color: theme.text }, message),
      filter || filterActive
        ? e(Text, { color: theme.warning }, '  Filter: ' + filter + (filterActive ? '_' : '') + (filterActive ? '  (Esc to clear)' : ''))
        : null,
      e(Box, { flexDirection: 'column', marginTop: 1 },
        e(Text, { dimColor: true, color: theme.muted }, '  No matches found.')
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

  var cols = 80;
  try { cols = process.stdout.columns || 80; } catch (_) {}

  var filterEl = null;
  if (!compact && filterActive) {
    filterEl = e(Text, { color: theme.warning }, '  Filter: ' + filter + '_  (Esc to clear)');
  }

  var choiceElements = filtered.map(function (choice, idx) {
    var isHighlighted = idx === clampedHighlight;
    var label = choice.name || choice.label || choice.value || '?';
    var desc = choice.description;

    var arrowChar = isHighlighted ? ARROW : ' ';
    var arrowColor = isHighlighted ? theme.primary : undefined;

    return e(Box, { key: choice.value || idx, flexDirection: 'row', justifyContent: 'space-between' },
      e(Box, { flexDirection: 'row' },
        e(Text, {}, '  '),
        e(Text, { color: arrowColor, bold: isHighlighted }, arrowChar),
        e(Text, { color: theme.text, bold: isHighlighted }, ' ' + label)
      ),
      desc ? e(Text, { dimColor: true, color: theme.muted }, desc) : null
    );
  });

  var scrollEl = null;
  if (filtered.length > 8) {
    scrollEl = e(Box, { flexDirection: 'row', justifyContent: 'flex-end' },
      e(Text, { dimColor: true, color: theme.muted }, '(' + (clampedHighlight + 1) + '/' + filtered.length + ')')
    );
  }

  var sepWidth = Math.max(0, Math.min(cols, 100) - 2);
  var headerSep = e(Text, { color: theme.border }, '  ' + '\u2500'.repeat(sepWidth));

  return e(Box, { flexDirection: 'column', paddingTop: 1 },
    e(Box, { flexDirection: 'row', justifyContent: 'center' },
      e(Text, { bold: true, color: theme.text }, message)
    ),
    filterEl,
    headerSep,
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...choiceElements),
    scrollEl
  );
}

module.exports = { SelectPrompt };
