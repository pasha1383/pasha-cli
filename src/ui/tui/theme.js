'use strict';

/*
 * Shared color/spacing tokens for the Ink-based TUI (src/ui/tui/**).
 *
 * Every component should pull its colors from here instead of writing
 * ad-hoc string literals ('cyan', 'gray', ...) inline -- that way the whole
 * wizard reads as one coherent palette, and the palette only needs to
 * change in one place. Values are plain Ink-compatible color names (Ink
 * resolves these itself; this module intentionally does not depend on
 * chalk or any styling library).
 */

var theme = {
  // Brand accent -- the "pasha" wordmark/logo and other one-off brand notes.
  brand: 'magenta',

  // Primary interactive accent -- focus/selection arrows, active highlights,
  // the current step in the rail, filter text, spinners.
  primary: 'cyan',

  // Background used behind a fully-selected/highlighted row (e.g. the
  // highlighted row on the Summary screen). Pair with `onAccent` for the
  // foreground text color that sits on top of it.
  accentBg: 'cyan',
  onAccent: 'black',

  // Primary readable body text.
  text: 'white',

  // Secondary/low-emphasis text -- hints, captions, placeholder/default
  // value labels, anything that should visually recede.
  muted: 'gray',

  // Box borders, rule lines, separators.
  border: 'gray',

  // Semantic states.
  success: 'green',
  warning: 'yellow',
  error: 'red',
};

module.exports = { theme: theme };
