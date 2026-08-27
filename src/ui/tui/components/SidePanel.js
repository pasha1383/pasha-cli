'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation, isAnimationEnabled } = require('../hooks/useAnimation');
const { theme } = require('../theme');
const archDescriptions = require('../arch-descriptions');
const e = React.createElement;

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function visualLength(str) {
  return stripAnsi(str).length;
}

var BASE_WIDTH = 40;
var WIDE_THRESHOLD = 100;
var CROSSFADE_FRAMES = 10;

var SECTION_HEADER = 'header';
var SECTION_DESC = 'desc';
var SECTION_CONTENT = 'content';
var SECTION_BLANK = 'blank';

function getPanelWidth() {
  var cols = process.stdout.columns || 80;
  if (cols >= WIDE_THRESHOLD) return BASE_WIDTH;
  return Math.max(30, Math.floor(cols * 0.38));
}

// Rows always reserved by chrome around the panel, regardless of its own
// content: the header bar (3: top border, title, bottom border), the
// step rail (1), the gap between the rail and the question (2), the
// footer bar (1), and the key-hints line (1) -- plus a couple of rows of
// margin. Getting this wrong doesn't just look a little cramped: since
// the panel unconditionally pads its content to this many rows, too
// generous a budget makes the whole screen taller than the terminal,
// pushing the header and step rail off the top with no way to scroll
// back to them (this app runs in the alternate screen buffer, which
// has no separate scrollback).
var RESERVED_CHROME_ROWS = 11;

function getMaxVisibleLines() {
  var rows = process.stdout.rows || 24;
  return Math.max(10, rows - RESERVED_CHROME_ROWS);
}

function wrapLines(text, maxLen) {
  if (maxLen <= 0) return [];
  var words = text.split(/\s+/);
  var lines = [];
  var line = '';
  for (var wi = 0; wi < words.length; wi++) {
    var word = words[wi];
    var candidate = line ? line + ' ' + word : word;
    if (candidate.length > maxLen && line.length > 0) {
      lines.push(line.trim());
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line.trim());
  return lines.length > 0 ? lines : [''];
}

function buildTaggedLines(info, innerWidth) {
  var lines = [];

  lines.push({ text: 'What is this?', section: SECTION_HEADER });

  var desc = wrapLines(info.description, innerWidth);
  for (var di = 0; di < desc.length; di++) {
    lines.push({ text: desc[di], section: SECTION_DESC });
  }
  lines.push({ text: '', section: SECTION_BLANK });

  if (info.bestFor) {
    var best = wrapLines(info.bestFor, innerWidth);
    lines.push({ text: '\uD83C\uDFAF Best for:', section: SECTION_HEADER });
    for (var bi = 0; bi < best.length; bi++) {
      lines.push({ text: best[bi], section: SECTION_DESC });
    }
    lines.push({ text: '', section: SECTION_BLANK });
  }

  if (info.files) {
    var files = wrapLines(info.files, innerWidth);
    lines.push({ text: '\uD83D\uDCC1 File structure:', section: SECTION_HEADER });
    for (var fi = 0; fi < files.length; fi++) {
      lines.push({ text: files[fi], section: SECTION_CONTENT });
    }
    lines.push({ text: '', section: SECTION_BLANK });
  }

  return lines;
}

function renderPanel(boxInfo, isDimmed, scrollOffset, boxWidth) {
  if (!boxInfo) return null;

  var ink = getInk();
  var Text = ink.Text;
  var Box = ink.Box;

  var innerWidth = boxWidth - 4;
  if (innerWidth < 4) innerWidth = 4;

  var title = boxInfo.title || '';
  var titleDashMin = 4;
  var availableTitle = boxWidth - 2 - titleDashMin;
  var displayTitle = title;
  if (displayTitle.length > availableTitle) {
    displayTitle = displayTitle.substring(0, availableTitle);
  }
  var titleSpace = displayTitle.length + 2;
  var dashes = boxWidth - 2 - titleSpace;
  if (dashes < 0) dashes = 0;
  var topBorder = '\u250C ' + displayTitle + ' ' + '\u2500'.repeat(dashes) + '\u2510';
  var bottomBorder = '\u2514' + '\u2500'.repeat(boxWidth - 2) + '\u2518';

  var maxVisible = getMaxVisibleLines();
  var viewHeight = maxVisible - 2;
  if (viewHeight < 1) viewHeight = 1;

  var taggedLines = buildTaggedLines(boxInfo, innerWidth);
  var totalLines = taggedLines.length;
  var maxScroll = Math.max(0, totalLines - viewHeight);
  var scroll = Math.max(0, Math.min(scrollOffset, maxScroll));

  var visibleLines = taggedLines.slice(scroll, scroll + viewHeight);
  while (visibleLines.length < viewHeight) {
    visibleLines.push({ text: '', section: SECTION_BLANK });
  }

  var hasUp = scroll > 0;
  var hasDown = scroll < maxScroll;
  var borderColor = isDimmed ? theme.muted : theme.primary;

  var lineElements = [];

  for (var i = 0; i < visibleLines.length; i++) {
    var item = visibleLines[i];
    var line = item.text;
    var section = item.section;

    var color;
    var bold = false;
    var dim = false;

    if (section === SECTION_HEADER) {
      color = isDimmed ? theme.muted : theme.primary;
      bold = true;
    } else if (section === SECTION_CONTENT) {
      color = isDimmed ? theme.muted : theme.text;
      dim = true;
    } else if (section === SECTION_BLANK || section === SECTION_DESC) {
      color = isDimmed ? theme.muted : theme.text;
    }

    var isBlank = line.length === 0;
    var pad = Math.max(0, innerWidth - visualLength(line));
    // An empty string here collapses the Text node to zero width in Ink's
    // layout, gluing the left/right border chars together with nothing
    // between them -- pad blank filler rows with spaces just like content
    // rows so the row box keeps its full width.
    var content = isBlank ? ' '.repeat(innerWidth) : '  ' + line + ' '.repeat(pad);

    if (i === 0 && hasUp) {
      var upPad = Math.max(0, innerWidth - 1);
      var upContent = '  ' + '\u2191' + ' '.repeat(upPad);
      lineElements.push(
        e(Box, { key: 'up-' + i, flexDirection: 'row', width: boxWidth },
          e(Text, { color: borderColor }, '\u2502'),
          e(Text, { bold: true, color: borderColor }, upContent),
          e(Text, { color: borderColor }, '\u2502')
        )
      );
    }

    lineElements.push(
      e(Box, { key: i, flexDirection: 'row', width: boxWidth },
        e(Text, { color: borderColor }, '\u2502'),
        e(Text, { dimColor: dim, bold: bold, color: color }, content),
        e(Text, { color: borderColor }, '\u2502')
      )
    );

    if (i === visibleLines.length - 1 && hasDown) {
      var downPad = Math.max(0, innerWidth - 1);
      var downContent = '  ' + '\u2193' + ' '.repeat(downPad);
      lineElements.push(
        e(Box, { key: 'down-' + i, flexDirection: 'row', width: boxWidth },
          e(Text, { color: borderColor }, '\u2502'),
          e(Text, { bold: true, color: borderColor }, downContent),
          e(Text, { color: borderColor }, '\u2502')
        )
      );
    }
  }

  return e(Box, {
    flexDirection: 'column',
    width: boxWidth,
    flexShrink: 0,
  },
    e(Text, { color: borderColor }, topBorder),
    ...lineElements,
    e(Text, { color: borderColor }, bottomBorder)
  );
}

function SidePanel(_a) {
  var architecture = _a.architecture;
  var visible = _a.visible;

  var ink = getInk();
  var Box = ink.Box;
  var Text = ink.Text;

  if (!visible) return null;

  var info = architecture ? archDescriptions[architecture] : null;

  var anim = useAnimation({ fps: 30 });
  var animEnabled = isAnimationEnabled();

  var transitionRef = React.useRef({ startFrame: 0, prevArch: null });
  var prevArchRef = React.useRef(architecture);

  var _scroll = React.useState(0);
  var scrollOffset = _scroll[0];
  var setScrollOffset = _scroll[1];

  React.useEffect(function () {
    setScrollOffset(0);
  }, [architecture]);

  if (architecture !== prevArchRef.current && animEnabled) {
    if (prevArchRef.current !== null && prevArchRef.current !== undefined) {
      transitionRef.current = { startFrame: anim.frame };
    } else {
      transitionRef.current = { startFrame: 0 };
    }
    prevArchRef.current = architecture;
  }

  // Previously crossfaded by rendering the outgoing and incoming panels
  // stacked on top of each other for CROSSFADE_FRAMES. Each panel pads
  // itself to a fixed, often 30+ row height, so for that entire window
  // total output height could run to 2x a single panel -- reliably
  // exceeding the terminal's row count. Ink's own renderer has a special
  // code path for exactly that case (output taller than the terminal)
  // that bypasses its normal incremental-erase tracking entirely; once
  // the transition ends and output height drops back under the
  // terminal's row count, that tracking is left out of sync with what's
  // actually on screen, leaving a stale full frame behind a new one.
  // Simple single-panel dim-in on the incoming panel instead -- same
  // panel, no second one stacked underneath it.
  var crossfadeT = 1;
  if (transitionRef.current.startFrame > 0 && animEnabled) {
    var elapsed = anim.frame - transitionRef.current.startFrame;
    if (elapsed < CROSSFADE_FRAMES) {
      crossfadeT = elapsed / CROSSFADE_FRAMES;
    } else {
      transitionRef.current = { startFrame: 0 };
    }
  }

  var boxWidth = getPanelWidth();

  if (!info) {
    var innerW = Math.max(10, boxWidth - 4);
    var msg = 'Select an option to see details';
    var padTotal = Math.max(0, innerW - msg.length);
    var padLeft = Math.floor(padTotal / 2);

    var phTop = '\u250C' + '\u2500'.repeat(boxWidth - 2) + '\u2510';
    var phBottom = '\u2514' + '\u2500'.repeat(boxWidth - 2) + '\u2518';

    return e(Box, { flexDirection: 'column', marginLeft: 2, paddingTop: 1, width: boxWidth, flexShrink: 0 },
      e(Text, { color: theme.primary }, phTop),
      e(Box, { flexDirection: 'row', width: boxWidth },
        e(Text, { color: theme.primary }, '\u2502'),
        e(Text, { dimColor: true, color: theme.muted }, '  ' + ' '.repeat(padLeft) + msg),
        e(Text, { color: theme.primary }, '\u2502')
      ),
      e(Text, { color: theme.primary }, phBottom)
    );
  }

  var isDimmed = animEnabled && crossfadeT < 1 ? crossfadeT < 0.6 : false;

  var newPanel = renderPanel(info, isDimmed, scrollOffset, boxWidth);

  return e(Box, { flexDirection: 'column', marginLeft: 2, paddingTop: 1 },
    newPanel
  );
}

module.exports = { SidePanel, getPanelWidth };
