'use strict';

let _loaded = false;
let _modules = {
  ink: null,
  inkTextInput: null,
  inkSpinner: null,
  inkSelectInput: null,
  inkMultiSelect: null,
  React: null,
};

async function initInk() {
  if (_loaded) return _modules;

  try {
    _modules.React = require('react');
  } catch (err) {
    throw new Error(
      'React not found. Ink 5 requires React 18.\n' +
      'Install: npm install react@18\n' +
      'Original error: ' + err.message
    );
  }

  if (!_modules.React || !_modules.React.createElement) {
    throw new Error('React installation appears broken (missing createElement).');
  }

  var major = Number((_modules.React.version || '').split('.')[0]);
  if (major < 18) {
    throw new Error(
      'React ' + _modules.React.version + ' found but Ink 5 requires React >= 18.\n' +
      'Install: npm install react@18'
    );
  }

  try {
    _modules.ink = await import('ink');
  } catch (err) {
    throw new Error(
      'Failed to load Ink 5 (ESM).\n' +
      'Original error: ' + err.message
    );
  }

  try {
    _modules.inkTextInput = await import('ink-text-input');
  } catch (err) {
    throw new Error(
      'Failed to load ink-text-input (required).\n' +
      'Original error: ' + err.message
    );
  }

  try { _modules.inkSpinner = await import('ink-spinner'); }
  catch (err) { _modules.inkSpinner = null; }

  try { _modules.inkSelectInput = await import('ink-select-input'); }
  catch (err) { _modules.inkSelectInput = null; }

  try { _modules.inkMultiSelect = await import('ink-multi-select'); }
  catch (err) { _modules.inkMultiSelect = null; }

  _loaded = true;
  return _modules;
}

function getInk() {
  if (!_loaded || !_modules.ink) {
    throw new Error('Ink not initialized. Call initInk() first.');
  }
  return _modules.ink;
}

function getInkTextInput() {
  if (!_loaded || !_modules.inkTextInput) {
    throw new Error('ink-text-input not initialized. Call initInk() first.');
  }
  return _modules.inkTextInput;
}

function getInkSpinner() {
  if (!_loaded || !_modules.inkSpinner) {
    throw new Error('ink-spinner not initialized. Call initInk() first.');
  }
  return _modules.inkSpinner;
}

function getInkSelectInput() {
  if (!_loaded || !_modules.inkSelectInput) {
    throw new Error('ink-select-input not initialized. Call initInk() first.');
  }
  return _modules.inkSelectInput;
}

function getInkMultiSelect() {
  if (!_loaded || !_modules.inkMultiSelect) {
    throw new Error('ink-multi-select not initialized. Call initInk() first.');
  }
  return _modules.inkMultiSelect;
}

function isReady() {
  return _loaded;
}

module.exports = { initInk, getInk, getInkTextInput, getInkSpinner, getInkSelectInput, getInkMultiSelect, isReady };
