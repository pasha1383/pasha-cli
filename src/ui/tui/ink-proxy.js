'use strict';

let _ink = null;
let _inkTextInput = null;
let _inkSpinner = null;
let _inkSelectInput = null;
let _inkMultiSelect = null;

async function initInk() {
  _ink = await import('ink');
  _inkTextInput = await import('ink-text-input');
  _inkSpinner = await import('ink-spinner');
  try { _inkSelectInput = await import('ink-select-input'); } catch (_e) {}
  try { _inkMultiSelect = await import('ink-multi-select'); } catch (_e) {}
  return _ink;
}

function getInk() {
  if (!_ink) throw new Error('Ink not initialized. Call initInk() first.');
  return _ink;
}

function getInkTextInput() {
  if (!_inkTextInput) throw new Error('ink-text-input not initialized. Call initInk() first.');
  return _inkTextInput;
}

function getInkSpinner() {
  if (!_inkSpinner) throw new Error('ink-spinner not initialized. Call initInk() first.');
  return _inkSpinner;
}

function getInkSelectInput() {
  if (!_inkSelectInput) throw new Error('ink-select-input not initialized. Call initInk() first.');
  return _inkSelectInput;
}

function getInkMultiSelect() {
  if (!_inkMultiSelect) throw new Error('ink-multi-select not initialized. Call initInk() first.');
  return _inkMultiSelect;
}

function isReady() {
  return !!_ink;
}

module.exports = { initInk, getInk, getInkTextInput, getInkSpinner, getInkSelectInput, getInkMultiSelect, isReady };
