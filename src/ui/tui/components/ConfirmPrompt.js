'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const e = React.createElement;

function ConfirmPrompt({ message, defaultValue, onConfirm }) {
  const { Text, Box, useInput } = getInk();
  var def = defaultValue !== undefined ? defaultValue : true;
  var [selected, setSelected] = React.useState(def);

  useInput(function (input, key) {
    if (key.leftArrow || key.rightArrow || input === 'y' || input === 'n') {
      if (input === 'y') setSelected(true);
      else if (input === 'n') setSelected(false);
      else setSelected(!selected);
    } else if (key.return) {
      if (onConfirm) onConfirm(selected);
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
