'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

function ConfirmPrompt({ message, defaultValue, onConfirm }) {
  const { Text, Box, useInput } = getInk();
  const def = defaultValue !== undefined ? defaultValue : true;
  const [selected, setSelected] = React.useState(def);

  useInput(function (input, key) {
    if (key.leftArrow || key.rightArrow) {
      setSelected(function (prev) { return !prev; });
      return;
    }
    if (input === 'y') {
      setSelected(true);
      return;
    }
    if (input === 'n') {
      setSelected(false);
      return;
    }
    if (key.return) {
      if (onConfirm) onConfirm(selected);
      return;
    }
  });

  var arrowChar = '\u276F';

  return e(Box, { flexDirection: 'column', paddingTop: 1 },
    e(Text, { bold: true, color: 'white' }, message),
    e(Box, { flexDirection: 'column', marginTop: 1 },
      e(Box, { flexDirection: 'row' },
        e(Text, {}, '  '),
        e(Text, { color: selected ? 'cyan' : 'gray' }, selected ? arrowChar : ' '),
        e(Text, { color: 'white', bold: selected }, ' Yes'),
        e(Text, { dimColor: true, color: 'gray' }, selected ? '  (default)' : '')
      ),
      e(Box, { flexDirection: 'row' },
        e(Text, {}, '  '),
        e(Text, { color: !selected ? 'cyan' : 'gray' }, !selected ? arrowChar : ' '),
        e(Text, { color: 'white', bold: !selected }, ' No'),
        e(Text, { dimColor: true, color: 'gray' }, !selected ? '  (default)' : '')
      )
    )
  );
}

module.exports = { ConfirmPrompt };
