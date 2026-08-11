'use strict';

const KEYS = {
  UP: 'upArrow',
  DOWN: 'downArrow',
  LEFT: 'leftArrow',
  RIGHT: 'rightArrow',
  ENTER: 'return',
  BACKSPACE: 'backspace',
  DELETE: 'delete',
  SPACE: 'space',
  TAB: 'tab',
  ESCAPE: 'escape',
  CTRL_C: 'ctrlC',
  CTRL_L: 'ctrlL',
  K: 'k',
  J: 'j',
  A: 'a',
  N: 'n',
  S: 's',
  E: 'e',
  QUESTION: '?',
  SLASH: '/',
};

const ACTIONS = {
  MOVE_UP: 'MOVE_UP',
  MOVE_DOWN: 'MOVE_DOWN',
  GO_BACK: 'GO_BACK',
  CONFIRM: 'CONFIRM',
  TOGGLE: 'TOGGLE',
  SELECT_ALL: 'SELECT_ALL',
  SELECT_NONE: 'SELECT_NONE',
  NEXT_PANE: 'NEXT_PANE',
  HELP: 'HELP',
  JUMP_SUMMARY: 'JUMP_SUMMARY',
  EDIT_FROM_SUMMARY: 'EDIT_FROM_SUMMARY',
  QUIT: 'QUIT',
  REDRAW: 'REDRAW',
  CLOSE_OVERLAY: 'CLOSE_OVERLAY',
  FILTER: 'FILTER',
};

/**
 * @param {string} input - raw input character
 * @param {{key: {name?: string, ctrl?: boolean, meta?: boolean, shift?: boolean}}} info
 * @returns {string|null} action name or null
 */
function mapKey(input, info) {
  const key = info && info.key ? info.key : {};
  const name = key.name;
  const ctrl = key.ctrl;
  const meta = key.meta;

  if (ctrl && !meta) {
    if (input === 'c' || input === '\x03') return ACTIONS.QUIT;
    if (input === 'l' || input === '\x0c') return ACTIONS.REDRAW;
  }

  if (name === KEYS.ESCAPE) return ACTIONS.CLOSE_OVERLAY;
  if (name === KEYS.TAB) return ACTIONS.NEXT_PANE;
  if (name === KEYS.UP || input === 'k') return ACTIONS.MOVE_UP;
  if (name === KEYS.DOWN || input === 'j') return ACTIONS.MOVE_DOWN;
  if (name === KEYS.LEFT || name === KEYS.BACKSPACE) return ACTIONS.GO_BACK;
  if (name === KEYS.RIGHT || name === KEYS.ENTER) return ACTIONS.CONFIRM;
  if (name === KEYS.SPACE) return ACTIONS.TOGGLE;
  if (input === 'a') return ACTIONS.SELECT_ALL;
  if (input === 'n') return ACTIONS.SELECT_NONE;
  if (input === '?' || name === KEYS.QUESTION) return ACTIONS.HELP;
  if (input === 's') return ACTIONS.JUMP_SUMMARY;
  if (input === 'e') return ACTIONS.EDIT_FROM_SUMMARY;
  if (input === '/') return ACTIONS.FILTER;

  return null;
}

function hintsForContext(context) {
  if (context === 'done') {
    return [
      { key: 'Enter', label: 'exit' },
      { key: 'Ctrl+C', label: 'quit' },
    ];
  }

  if (context === 'progress') {
    return [
      { key: 'Ctrl+C', label: 'quit' },
    ];
  }

  if (context === 'help') {
    return [
      { key: 'Esc', label: 'close' },
    ];
  }

  if (context === 'confirm-quit') {
    return [
      { key: 'y', label: 'quit' },
      { key: 'n/Esc', label: 'cancel' },
    ];
  }

  const base = [
    { key: '\u2191\u2193 k/j', label: 'move' },
    { key: 'Enter', label: 'confirm' },
    { key: '\u2190/BS', label: 'back' },
    { key: '?', label: 'help' },
  ];

  if (context === 'select') {
    base.push({ key: 'type', label: 'filter' });
  }

  if (context === 'multi-select') {
    base.push({ key: 'Space', label: 'toggle' });
    base.push({ key: 'a/n', label: 'all/none' });
    base.push({ key: 'type', label: 'filter' });
  }

  if (context === 'summary') {
    base.push({ key: 'e', label: 'edit' });
  }

  if (context === 'input' || context === 'confirm') {
    base.push({ key: 's', label: 'summary' });
  }

  base.push({ key: 'Ctrl+C', label: 'quit' });

  return base;
}

module.exports = { KEYS, ACTIONS, mapKey, hintsForContext };
