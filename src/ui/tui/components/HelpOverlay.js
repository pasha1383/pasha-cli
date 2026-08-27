'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { theme } = require('../theme');
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
  const titleStr = 'Help  —  ' + ctxLabel;

  var maxKey = 0;
  for (var i = 0; i < hintList.length; i++) {
    var len = (hintList[i].key || '').length;
    if (len > maxKey) maxKey = len;
  }

  var innerWidth = titleStr.length + 4;
  if (innerWidth < 50) innerWidth = 50;
  var boxWidth = innerWidth + 2;

  var top_ = '┌' + '─'.repeat(boxWidth - 2) + '┐';
  var bottom_ = '└' + '─'.repeat(boxWidth - 2) + '┘';
  var sep = '│';
  var thin = '─';

  var titlePad = Math.max(0, innerWidth - titleStr.length);
  var titleLeft = Math.floor(titlePad / 2);
  var titleRight = titlePad - titleLeft;

  var rows = [];

  rows.push(e(Text, { color: theme.primary }, top_));

  rows.push(
    e(Box, { key: 'title', flexDirection: 'row' },
      e(Text, { color: theme.primary }, sep),
      e(Text, { bold: true, color: theme.text }, ' '.repeat(titleLeft) + titleStr + ' '.repeat(titleRight)),
      e(Text, { color: theme.primary }, sep)
    )
  );

  rows.push(
    e(Box, { key: 'gap', flexDirection: 'row' },
      e(Text, { color: theme.primary }, sep),
      e(Text, { color: theme.border }, thin.repeat(innerWidth)),
      e(Text, { color: theme.primary }, sep)
    )
  );

  for (var j = 0; j < hintList.length; j++) {
    var hint = hintList[j];
    var keyStr = hint.key || '';
    var descStr = hint.label || '';
    var rightPad = Math.max(0, innerWidth - keyStr.length - descStr.length - 7);
    rows.push(
      e(Box, { key: 'h-' + j, flexDirection: 'row' },
        e(Text, { color: theme.primary }, sep),
        e(Text, { bold: true, color: theme.text }, '  ' + keyStr),
        e(Text, { dimColor: true, color: theme.muted }, '  —  ' + descStr + ' '.repeat(rightPad)),
        e(Text, { color: theme.primary }, sep)
      )
    );
  }

  var closeText = 'Press ? or Esc to close';
  var closePad = Math.max(0, innerWidth - closeText.length);
  rows.push(
    e(Box, { key: 'close', flexDirection: 'row' },
      e(Text, { color: theme.primary }, sep),
      e(Text, { dimColor: true, color: theme.muted }, ' '.repeat(closePad) + closeText),
      e(Text, { color: theme.primary }, sep)
    )
  );

  rows.push(e(Text, { color: theme.primary }, bottom_));

  return e(Box, { flexDirection: 'column', flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
    e(Box, { flexDirection: 'column' }, ...rows)
  );
}

module.exports = { HelpOverlay };
