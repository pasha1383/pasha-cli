'use strict';

var React = require('react');
var { getInk } = require('../ink-proxy');
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
  return val ? 'Yes' : 'No';
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
    if (key.leftArrow || key.backspace) {
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

  var titleStr = 'Configuration Summary';
  var footerStr = '  \u2191\u2193 navigate \u00b7 Enter/e edit \u00b7 g generate \u00b7 \u2190 back  ';

  var contentWidth = 2 + maxLabelLen + 1 + 2 + maxValueLen + 2;
  var innerWidth = Math.max(titleStr.length + 4, footerStr.length, contentWidth);
  if (innerWidth < 53) innerWidth = 53;

  var boxWidth = innerWidth + 2;

  var top_ = '\u250C' + '\u2500'.repeat(boxWidth - 2) + '\u2510';
  var mid_ = '\u251C' + '\u2500'.repeat(boxWidth - 2) + '\u2524';
  var bottom_ = '\u2514' + '\u2500'.repeat(boxWidth - 2) + '\u2518';
  var sep = '\u2502';

  var titlePad = Math.max(0, innerWidth - titleStr.length);
  var titleLeft = Math.floor(titlePad / 2);
  var titleRight = titlePad - titleLeft;

  var labelColonWidth = maxLabelLen + 1;

  var elements = [];

  elements.push(e(Text, { color: 'gray' }, top_));

  elements.push(
    e(Box, { key: 'title', flexDirection: 'row' },
      e(Text, { color: 'gray' }, sep),
      e(Text, { bold: true, color: 'white' }, ' '.repeat(titleLeft) + titleStr + ' '.repeat(titleRight)),
      e(Text, { color: 'gray' }, sep)
    )
  );

  elements.push(e(Text, { color: 'gray' }, mid_));

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
    var contentPrefix = '  ' + labelPart;
    var rightPad = innerWidth - contentPrefix.length - valDisplay.length;

    if (rightPad < 0) rightPad = 0;

    if (isHighlighted) {
      var rowContent = contentPrefix + valDisplay + ' '.repeat(rightPad);
      elements.push(e(Text, { key: 'r-' + idx, backgroundColor: 'cyan', color: 'black' },
        sep + rowContent + sep
      ));
    } else {
      var isYes = row.isBool && row.value === true;
      var isNo = row.isBool && row.value === false;
      var valColor = isYes ? 'green' : 'white';
      var valDim = isNo;

      elements.push(
        e(Box, { key: 'r-' + idx, flexDirection: 'row' },
          e(Text, { color: 'gray' }, sep),
          e(Text, { color: 'white' }, contentPrefix),
          e(Text, { color: valColor, dimColor: valDim }, valDisplay + ' '.repeat(rightPad)),
          e(Text, { color: 'gray' }, sep)
        )
      );
    }
  });

  elements.push(e(Text, { color: 'gray' }, mid_));

  var footerPad = Math.max(0, innerWidth - footerStr.length);
  elements.push(
    e(Box, { key: 'footer', flexDirection: 'row' },
      e(Text, { color: 'gray' }, sep),
      e(Text, { dimColor: true, color: 'gray' }, footerStr + ' '.repeat(footerPad)),
      e(Text, { color: 'gray' }, sep)
    )
  );

  elements.push(e(Text, { color: 'gray' }, bottom_));

  return e(Box, { flexDirection: 'column', paddingTop: 1, paddingBottom: 1 }, ...elements);
}

module.exports = { SummaryScreen };
