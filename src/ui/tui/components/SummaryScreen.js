'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
var { theme } = require('../theme');
var e = React.createElement;

var SUMMARY_KEYS = [
  ['Project', 'projectName'],
  ['Author', 'author'],
  ['Language', 'language'],
  ['Framework', 'framework'],
  ['Architecture', 'architectureLabel'],
  ['ORM', 'orm'],
  ['Database', 'database'],
  ['Validation', 'validation'],
  ['Broker', 'broker'],
];

var EXTRA_LABELS = {
  useRedis: 'Redis',
  useAgentDocs: 'AGENT.md',
};

function fmtBool(val) {
  // Pair color with a symbol so the state still reads when color doesn't render.
  return val ? '✓ Yes' : '✗ No';
}

function SummaryScreen(_a) {
  var context = _a.context;
  var onEdit = _a.onEdit;
  var onKey = _a.onKey;
  var onContinue = _a.onContinue;
  var onGenerate = _a.onGenerate;
  var onBack = _a.onBack;

  var { Text, Box, useInput } = getInk();
  var ctx = context || {};
  var rows = [];

  SUMMARY_KEYS.forEach(function (entry) {
    var label = entry[0];
    var key = entry[1];
    var val = ctx[key];
    if (val === undefined || val === null || val === '') return;
    rows.push({ label: label, value: String(val), key: key, isBool: false });
  });

  Object.keys(EXTRA_LABELS).forEach(function (key) {
    if (ctx[key] !== undefined) {
      rows.push({ label: EXTRA_LABELS[key], value: ctx[key], key: key, isBool: true });
    }
  });

  var mods = ctx.modules;
  if (Array.isArray(mods) && mods.length) {
    rows.push({ label: 'Modules', value: mods, key: 'modules', isBool: false });
  }

  var _b = React.useState(0);
  var highlighted = _b[0];
  var setHighlighted = _b[1];

  useInput(function (input, key) {
    if (key.upArrow || input === 'k') {
      setHighlighted(Math.max(0, highlighted - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setHighlighted(Math.min(rows.length - 1, highlighted + 1));
      return;
    }
    if (key.return) {
      if (onEdit) onEdit();
      else if (onGenerate) onGenerate();
      else if (onContinue) onContinue();
      return;
    }
    if (input === 'e') {
      if (onEdit) onEdit();
      return;
    }
    if (input === 'g') {
      if (onGenerate) onGenerate();
      return;
    }
    // Most modern terminals send DEL (0x7f, parsed by Ink as key.delete) for
    // the physical Backspace key, not the historical BS (0x08, key.backspace)
    // -- treat both as "back" so this actually fires for real Backspace presses.
    if (key.leftArrow || key.backspace || key.delete || key.escape) {
      if (onBack) onBack();
      return;
    }
    if (onKey) onKey(input, key);
  });

  var maxLabelLen = 0;
  rows.forEach(function (r) {
    if (r.label.length > maxLabelLen) maxLabelLen = r.label.length;
  });

  var maxValueLen = 0;
  rows.forEach(function (r) {
    var vs = r.isBool ? fmtBool(r.value) : String(r.value);
    var len = (r.key === 'modules' && Array.isArray(r.value))
      ? String(r.value.length) + ' (' + r.value.join(', ') + ')'
      : vs;
    if (len.length > maxValueLen) maxValueLen = len.length;
  });

  var isPreview = !onEdit && !onGenerate;
  var titleStr = isPreview ? 'Answers So Far (preview)' : 'Configuration Summary';
  var footerParts = ['↑↓ navigate'];
  if (onEdit) footerParts.push('Enter/e edit');
  if (onGenerate) footerParts.push('g generate');
  footerParts.push(onBack ? (isPreview ? '←/Esc back to wizard' : '← back') : null);
  var footerStr = '  ' + footerParts.filter(Boolean).join(' · ') + '  ';

  var contentWidth = 2 + maxLabelLen + 1 + 2 + maxValueLen + 2;
  var innerWidth = Math.max(titleStr.length + 4, footerStr.length, contentWidth);
  if (innerWidth < 53) innerWidth = 53;

  var boxWidth = innerWidth + 2;

  var top_ = '┌' + '─'.repeat(boxWidth - 2) + '┐';
  var mid_ = '├' + '─'.repeat(boxWidth - 2) + '┤';
  var bottom_ = '└' + '─'.repeat(boxWidth - 2) + '┘';
  var sep = '│';

  var titlePad = Math.max(0, innerWidth - titleStr.length);
  var titleLeft = Math.floor(titlePad / 2);
  var titleRight = titlePad - titleLeft;

  var labelColonWidth = maxLabelLen + 1;

  var elements = [];

  elements.push(e(Text, { color: theme.border }, top_));

  elements.push(
    e(Box, { key: 'title', flexDirection: 'row' },
      e(Text, { color: theme.border }, sep),
      e(Text, { bold: true, color: theme.text }, ' '.repeat(titleLeft) + titleStr + ' '.repeat(titleRight)),
      e(Text, { color: theme.border }, sep)
    )
  );

  elements.push(e(Text, { color: theme.border }, mid_));

  rows.forEach(function (row, idx) {
    var label = row.label;
    var valDisplay = row.isBool
      ? fmtBool(row.value)
      : (row.key === 'modules' && Array.isArray(row.value))
        ? String(row.value.length) + ' (' + row.value.join(', ') + ')'
        : String(row.value);
    var isHighlighted = idx === highlighted;

    var labelColon = label + ':';
    var labelPart = labelColon + ' '.repeat(labelColonWidth - labelColon.length) + '  ';
    // Reserve the leading two spaces for a "❯ " pointer on the highlighted
    // row so focus doesn't rely on the background color alone.
    var pointerPrefix = isHighlighted ? '❯ ' : '  ';
    var contentPrefix = pointerPrefix + labelPart;
    var rightPad = innerWidth - contentPrefix.length - valDisplay.length;

    if (rightPad < 0) rightPad = 0;

    if (isHighlighted) {
      var rowContent = contentPrefix + valDisplay + ' '.repeat(rightPad);
      elements.push(e(Text, { key: 'r-' + idx, backgroundColor: theme.accentBg, color: theme.onAccent, bold: true },
        sep + rowContent + sep
      ));
    } else {
      var isYes = row.isBool && row.value === true;
      var isNo = row.isBool && row.value === false;
      var valColor = isYes ? theme.success : (isNo ? theme.muted : theme.text);

      elements.push(
        e(Box, { key: 'r-' + idx, flexDirection: 'row' },
          e(Text, { color: theme.border }, sep),
          e(Text, { color: theme.text }, contentPrefix),
          e(Text, { color: valColor }, valDisplay + ' '.repeat(rightPad)),
          e(Text, { color: theme.border }, sep)
        )
      );
    }
  });

  elements.push(e(Text, { color: theme.border }, mid_));

  var footerPad = Math.max(0, innerWidth - footerStr.length);
  elements.push(
    e(Box, { key: 'footer', flexDirection: 'row' },
      e(Text, { color: theme.border }, sep),
      e(Text, { dimColor: true, color: theme.muted }, footerStr + ' '.repeat(footerPad)),
      e(Text, { color: theme.border }, sep)
    )
  );

  elements.push(e(Text, { color: theme.border }, bottom_));

  return e(Box, { flexDirection: 'column', paddingTop: 1, paddingBottom: 1 }, ...elements);
}

module.exports = { SummaryScreen };
