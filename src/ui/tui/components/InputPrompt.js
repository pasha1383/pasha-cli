'use strict';

var React = require('react');
var { getInk, getInkTextInput } = require('../ink-proxy');
var e = React.createElement;

function InputPrompt(_a) {
  var message = _a.message;
  var defaultValue = _a.defaultValue;
  var validate = _a.validate;
  var onSubmit = _a.onSubmit;
  var onKey = _a.onKey;

  var { Text, Box, useInput } = getInk();
  var { UncontrolledTextInput } = getInkTextInput();
  var def = defaultValue || '';
  var _b = React.useState(def);
  var value = _b[0];
  var setValue = _b[1];
  var _c = React.useState(null);
  var error = _c[0];
  var setError = _c[1];

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

  useInput(function (input, key) {
    var ctrl = key.ctrl && !key.meta;
    if (ctrl && input === 'c') {
      if (onKey) onKey(input, key);
      return;
    }
    if (key.name === 'escape') {
      if (onKey) onKey(input, key);
      return;
    }
    if (input === '?' && !key.shift) {
      if (onKey) onKey(input, key);
      return;
    }
    if (input === '?' && key.shift) {
      if (onKey) onKey(input, key);
      return;
    }
    return;
  });

  var children = [];

  children.push(e(Text, { bold: true, color: 'white' }, message));
  children.push(e(Box, { flexDirection: 'row', marginTop: 1, key: 'input-row' },
    e(Text, { color: 'cyan', bold: true }, '  \u276F '),
    e(UncontrolledTextInput, {
      initialValue: def,
      onSubmit: handleSubmit,
      onChange: handleChange,
    })
  ));

  if (error) {
    children.push(e(Box, { marginTop: 1, key: 'error' },
      e(Text, { color: 'red', bold: true }, '  ' + error)
    ));
  }

  if (def && !value) {
    children.push(e(Box, { marginTop: 0, key: 'default' },
      e(Text, { dimColor: true, color: 'gray' }, '  Default: ' + def)
    ));
  }

  return e(Box, { flexDirection: 'column', paddingTop: 1 }, ...children);
}

module.exports = { InputPrompt };
