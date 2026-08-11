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

  var yesLabel = selected ? ' \u276F Yes' : '   Yes';
  var noLabel = !selected ? ' \u276F No' : '   No';

  return e(Box, { flexDirection: 'column', paddingTop: 1 },
    e(Text, { bold: true, color: 'yellow' }, message),
    e(Box, { flexDirection: 'row', marginTop: 1 },
      e(Text, { color: selected ? 'green' : undefined, bold: selected }, yesLabel),
      e(Text, {}, '    '),
      e(Text, { color: !selected ? 'red' : undefined, bold: !selected }, noLabel)
    )
  );
}

module.exports = { ConfirmPrompt };
