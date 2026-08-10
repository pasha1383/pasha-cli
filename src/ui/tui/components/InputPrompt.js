'use strict';

const React = require('react');
const { getInk, getInkTextInput } = require('../ink-proxy');
const e = React.createElement;

function InputPrompt({ message, defaultValue, validate, onSubmit }) {
  const { Text, Box } = getInk();
  const { UncontrolledTextInput } = getInkTextInput();
  var def = defaultValue || '';
  var [value, setValue] = React.useState(def);
  var [error, setError] = React.useState(null);

  function handleSubmit(val) {
    if (validate) {
      var result = validate(val);
      if (result !== true) {
        setError(result || 'Invalid input');
        return;
      }
    }
    setError(null);
    if (onSubmit) onSubmit(val);
  }

  function handleChange(val) {
    setValue(val);
    if (error && validate) {
      var result = validate(val);
      if (result === true) setError(null);
    }
  }

  var children = [
    e(Text, { bold: true, color: 'yellow' }, message),
    e(Box, { flexDirection: 'row', marginTop: 1, key: 'input-row' },
      e(Text, { color: 'cyan' }, '> '),
      e(UncontrolledTextInput, {
        initialValue: def,
        onSubmit: handleSubmit,
        onChange: handleChange,
      })
    ),
  ];

  if (error) {
    children.push(e(Text, { color: 'red', bold: true, key: 'error' }, error));
  }

  if (def && !value) {
    children.push(e(Text, { dimColor: true, key: 'default' }, 'Default: ' + def));
  }

  return e(Box, { flexDirection: 'column', paddingTop: 1 }, ...children);
}

module.exports = { InputPrompt };
