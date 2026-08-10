'use strict';

let _ink = null;
let _inkTextInput = null;
let _inkSpinner = null;

async function initInk() {
  _ink = await import('ink');
  _inkTextInput = await import('ink-text-input');
  _inkSpinner = await import('ink-spinner');
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

function isReady() {
  return !!_ink;
}

module.exports = { initInk, getInk, getInkTextInput, getInkSpinner, isReady };
