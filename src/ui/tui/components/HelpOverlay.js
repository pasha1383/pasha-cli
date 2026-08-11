'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

function HelpOverlay({ visible, context, hints, onClose }) {
  const { Text, Box, useInput } = getInk();

  useInput(function (input, key) {
    if (!visible) return;
    if (key.escape || input === '?') {
      if (onClose) onClose();
    }
  });

  if (!visible) return null;

  const hintList = hints || [];
  const ctxLabel = context || 'wizard';
  const titleStr = 'Help  \u2014  ' + ctxLabel;

  var maxKey = 0;
  for (var i = 0; i < hintList.length; i++) {
    var len = (hintList[i].key || '').length;
    if (len > maxKey) maxKey = len;
  }

  var innerWidth = titleStr.length + 4;
  if (innerWidth < 50) innerWidth = 50;
  var boxWidth = innerWidth + 2;

  var top_ = '\u250C' + '\u2500'.repeat(boxWidth - 2) + '\u2510';
  var bottom_ = '\u2514' + '\u2500'.repeat(boxWidth - 2) + '\u2518';
  var sep = '\u2502';
  var thin = '\u2500';

  var titlePad = Math.max(0, innerWidth - titleStr.length);
  var titleLeft = Math.floor(titlePad / 2);
  var titleRight = titlePad - titleLeft;

  var rows = [];

  rows.push(e(Text, { color: 'cyan' }, top_));

  rows.push(
    e(Box, { key: 'title', flexDirection: 'row' },
      e(Text, { color: 'cyan' }, sep),
      e(Text, { bold: true, color: 'white' }, ' '.repeat(titleLeft) + titleStr + ' '.repeat(titleRight)),
      e(Text, { color: 'cyan' }, sep)
    )
  );

  rows.push(
    e(Box, { key: 'gap', flexDirection: 'row' },
      e(Text, { color: 'cyan' }, sep),
      e(Text, { color: 'gray' }, thin.repeat(innerWidth)),
      e(Text, { color: 'cyan' }, sep)
    )
  );

  for (var j = 0; j < hintList.length; j++) {
    var hint = hintList[j];
    var keyStr = hint.key || '';
    var descStr = hint.label || '';
    var rightPad = Math.max(0, innerWidth - keyStr.length - descStr.length - 7);
    rows.push(
      e(Box, { key: 'h-' + j, flexDirection: 'row' },
        e(Text, { color: 'cyan' }, sep),
        e(Text, { bold: true, color: 'white' }, '  ' + keyStr),
        e(Text, { dimColor: true, color: 'gray' }, '  \u2014  ' + descStr + ' '.repeat(rightPad)),
        e(Text, { color: 'cyan' }, sep)
      )
    );
  }

  var closeText = 'Press ? or Esc to close';
  var closePad = Math.max(0, innerWidth - closeText.length);
  rows.push(
    e(Box, { key: 'close', flexDirection: 'row' },
      e(Text, { color: 'cyan' }, sep),
      e(Text, { dimColor: true, color: 'gray' }, ' '.repeat(closePad) + closeText),
      e(Text, { color: 'cyan' }, sep)
    )
  );

  rows.push(e(Text, { color: 'cyan' }, bottom_));

  return e(Box, { flexDirection: 'column', flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
    e(Box, { flexDirection: 'column' }, ...rows)
  );
}

module.exports = { HelpOverlay };
