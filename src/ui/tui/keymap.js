'use strict';

var KEYS = {
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
};

var ACTIONS = {
  MOVE_UP: 'moveUp',
  MOVE_DOWN: 'moveDown',
  GO_BACK: 'back',
  CONFIRM: 'confirm',
  TOGGLE: 'toggle',
  SELECT_ALL: 'selectAll',
  SELECT_NONE: 'selectNone',
  FILTER: 'filter',
  HELP: 'help',
  JUMP_SUMMARY: 'summary',
  EDIT: 'edit',
  QUIT: 'quit',
  REDRAW: 'redraw',
  CLOSE_OVERLAY: 'closeOverlay',
  NEXT_PANE: 'nextPane',
  EXIT: 'exit',
};

var BINDINGS = {
  select: [
    { keys: ['up', 'k'], label: 'Move up', action: 'moveUp' },
    { keys: ['down', 'j'], label: 'Move down', action: 'moveDown' },
    { keys: ['enter'], label: 'Select', action: 'confirm' },
    { keys: ['left', 'backspace'], label: 'Back', action: 'back' },
    { keys: ['/'], label: 'Filter', action: 'filter' },
    { keys: ['tab'], label: 'Focus panel', action: 'nextPane' },
    { keys: ['?'], label: 'Help', action: 'help' },
    { keys: ['s'], label: 'Skip to summary', action: 'summary' },
    { keys: ['ctrl+c'], label: 'Quit', action: 'quit' },
  ],
  'multi-select': [
    { keys: ['up', 'k'], label: 'Move up', action: 'moveUp' },
    { keys: ['down', 'j'], label: 'Move down', action: 'moveDown' },
    { keys: ['space'], label: 'Toggle', action: 'toggle' },
    { keys: ['a'], label: 'Select all', action: 'selectAll' },
    { keys: ['n'], label: 'Select none', action: 'selectNone' },
    { keys: ['enter'], label: 'Confirm', action: 'confirm' },
    { keys: ['left', 'backspace'], label: 'Back', action: 'back' },
    { keys: ['/'], label: 'Filter', action: 'filter' },
    { keys: ['?'], label: 'Help', action: 'help' },
    { keys: ['s'], label: 'Skip to summary', action: 'summary' },
    { keys: ['ctrl+c'], label: 'Quit', action: 'quit' },
  ],
  input: [
    { keys: ['enter'], label: 'Submit', action: 'confirm' },
    { keys: ['backspace'], label: 'Back', action: 'back' },
    { keys: ['s'], label: 'Skip to summary', action: 'summary' },
    { keys: ['?'], label: 'Help', action: 'help' },
    { keys: ['ctrl+c'], label: 'Quit', action: 'quit' },
  ],
  confirm: [
    { keys: ['enter'], label: 'Confirm', action: 'confirm' },
    { keys: ['left', 'right', 'y', 'n'], label: 'Toggle', action: 'toggle' },
    { keys: ['backspace'], label: 'Back', action: 'back' },
    { keys: ['s'], label: 'Skip to summary', action: 'summary' },
    { keys: ['?'], label: 'Help', action: 'help' },
    { keys: ['ctrl+c'], label: 'Quit', action: 'quit' },
  ],
  summary: [
    { keys: ['up', 'k'], label: 'Move up', action: 'moveUp' },
    { keys: ['down', 'j'], label: 'Move down', action: 'moveDown' },
    { keys: ['enter'], label: 'Continue', action: 'confirm' },
    { keys: ['backspace'], label: 'Back', action: 'back' },
    { keys: ['e'], label: 'Edit', action: 'edit' },
    { keys: ['s'], label: 'Skip to summary', action: 'summary' },
    { keys: ['?'], label: 'Help', action: 'help' },
    { keys: ['ctrl+c'], label: 'Quit', action: 'quit' },
  ],
  progress: [
    { keys: ['ctrl+c'], label: 'Quit', action: 'quit' },
  ],
  done: [
    { keys: ['enter'], label: 'Exit', action: 'exit' },
    { keys: ['ctrl+c'], label: 'Quit', action: 'quit' },
  ],
  'help': [
    { keys: ['esc'], label: 'Close', action: 'closeOverlay' },
  ],
  'confirm-quit': [
    { keys: ['y'], label: 'Quit', action: 'quit' },
    { keys: ['n', 'esc'], label: 'Cancel', action: 'closeOverlay' },
  ],
  welcome: [
    { keys: ['enter', 'space'], label: 'Start', action: 'confirm' },
    { keys: ['ctrl+c'], label: 'Quit', action: 'quit' },
  ],
};

function isKeyMatch(input, key, bindingKey) {
  var ctrl = key.ctrl && !key.meta;
  var name = key.name || '';

  if (bindingKey === 'ctrl+c') return ctrl && (input === 'c' || input === '\x03');
  if (bindingKey === 'ctrl+l') return ctrl && (input === 'l' || input === '\x0c');
  if (bindingKey === 'up') return name === 'upArrow';
  if (bindingKey === 'down') return name === 'downArrow';
  if (bindingKey === 'left') return name === 'leftArrow';
  if (bindingKey === 'right') return name === 'rightArrow';
  if (bindingKey === 'enter') return name === 'return';
  if (bindingKey === 'backspace') return name === 'backspace';
  if (bindingKey === 'delete') return name === 'delete';
  if (bindingKey === 'space') return input === ' ';
  if (bindingKey === 'tab') return key.tab || name === 'tab';
  if (bindingKey === 'esc') return name === 'escape';

  if (bindingKey === '?') return input === '?';
  if (bindingKey === '/') return input === '/';

  if (bindingKey.length === 1) {
    return input === bindingKey;
  }

  return false;
}

function mapKey(input, key, context) {
  var bindings = BINDINGS[context];
  if (!bindings) return null;

  for (var i = 0; i < bindings.length; i++) {
    var binding = bindings[i];
    for (var j = 0; j < binding.keys.length; j++) {
      if (isKeyMatch(input, key, binding.keys[j])) {
        return binding.action;
      }
    }
  }
  return null;
}

function _formatKeyName(k) {
  switch (k) {
    case 'up': return '\u2191';
    case 'down': return '\u2193';
    case 'left': return '\u2190';
    case 'right': return '\u2192';
    case 'enter': return 'Enter';
    case 'backspace': return 'BS';
    case 'space': return 'Space';
    case 'ctrl+c': return 'Ctrl+C';
    case 'ctrl+l': return 'Ctrl+L';
    case 'esc': return 'Esc';
    case 'tab': return 'Tab';
    case '?': return '?';
    case '/': return '/';
    default: return k;
  }
}

function hintsForContext(context) {
  var bindings = BINDINGS[context];
  if (!bindings) return [];

  return bindings.map(function (b) {
    return {
      key: b.keys.map(_formatKeyName).join(' '),
      label: b.label,
    };
  });
}

module.exports = { KEYS, ACTIONS, BINDINGS, mapKey, hintsForContext };
