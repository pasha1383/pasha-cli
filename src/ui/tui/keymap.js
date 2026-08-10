'use strict';

const KEYS = {
  UP: 'upArrow',
  DOWN: 'downArrow',
  LEFT: 'leftArrow',
  RIGHT: 'rightArrow',
  ENTER: 'return',
  BACKSPACE: 'backspace',
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

  if (key.ctrl) {
    if (input === 'c' || input === '\x03') return ACTIONS.QUIT;
    if (input === 'l' || input === '\x0c') return ACTIONS.REDRAW;
  }

  if (name === KEYS.UP || input === 'k' || name === KEYS.K) return ACTIONS.MOVE_UP;
  if (name === KEYS.DOWN || input === 'j' || name === KEYS.J) return ACTIONS.MOVE_DOWN;
  if (name === KEYS.LEFT || name === KEYS.BACKSPACE) return ACTIONS.GO_BACK;
  if (name === KEYS.RIGHT || name === KEYS.ENTER) return ACTIONS.CONFIRM;
  if (name === KEYS.SPACE) return ACTIONS.TOGGLE;
  if (input === 'a' || name === KEYS.A) return ACTIONS.SELECT_ALL;
  if (input === 'n' || name === KEYS.N) return ACTIONS.SELECT_NONE;
  if (name === KEYS.TAB) return ACTIONS.NEXT_PANE;
  if (input === '?' || name === KEYS.QUESTION) return ACTIONS.HELP;
  if (input === 's' || name === KEYS.S) return ACTIONS.JUMP_SUMMARY;
  if (input === 'e' || name === KEYS.E) return ACTIONS.EDIT_FROM_SUMMARY;
  if (name === KEYS.ESCAPE) return ACTIONS.CLOSE_OVERLAY;

  return null;
}

function hintsForContext(context) {
  const base = [
    { key: '\u2191\u2193', label: 'move' },
    { key: '\u23CE', label: 'confirm' },
    { key: '\u2190', label: 'back' },
    { key: '?', label: 'help' },
  ];

  if (context === 'select' || context === 'multi-select') {
    base.push({ key: '/', label: 'filter' });
  }

  if (context === 'multi-select') {
    base.splice(1, 0, { key: 'space', label: 'toggle' });
    base.splice(2, 0, { key: 'a/n', label: 'all/none' });
  }

  if (context === 'summary') {
    base.push({ key: 'e', label: 'edit' });
  }

  if (context === 'wizard') {
    base.push({ key: 's', label: 'summary' });
  }

  base.push({ key: '^C', label: 'quit' });

  return base;
}

module.exports = { KEYS, ACTIONS, mapKey, hintsForContext };
