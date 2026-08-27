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

function getMaxVisibleLines() {
  var rows = process.stdout.rows || 24;
  return Math.max(10, rows - 4);
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
    var content = isBlank ? '' : '  ' + line + ' '.repeat(pad);

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
      transitionRef.current = {
        startFrame: anim.frame,
        prevArch: prevArchRef.current,
      };
    } else {
      transitionRef.current = { startFrame: 0, prevArch: null };
    }
    prevArchRef.current = architecture;
  }

  var showOld = false;
  var crossfadeT = 1;
  var oldInfo = null;

  if (transitionRef.current.startFrame > 0 && animEnabled && transitionRef.current.prevArch !== null) {
    var elapsed = anim.frame - transitionRef.current.startFrame;
    if (elapsed < CROSSFADE_FRAMES) {
      showOld = true;
      crossfadeT = elapsed / CROSSFADE_FRAMES;
      oldInfo = archDescriptions[transitionRef.current.prevArch] || null;
    } else {
      transitionRef.current = { startFrame: 0, prevArch: null };
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

    return e(Box, { flexDirection: 'column', marginLeft: 2, width: boxWidth, flexShrink: 0 },
      e(Text, { color: theme.primary }, phTop),
      e(Box, { flexDirection: 'row', width: boxWidth },
        e(Text, { color: theme.primary }, '\u2502'),
        e(Text, { dimColor: true, color: theme.muted }, '  ' + ' '.repeat(padLeft) + msg),
        e(Text, { color: theme.primary }, '\u2502')
      ),
      e(Text, { color: theme.primary }, phBottom)
    );
  }

  var oldPanel = showOld && oldInfo
    ? renderPanel(oldInfo, true, scrollOffset, boxWidth)
    : null;

  var isDimmed = animEnabled && crossfadeT < 1 ? crossfadeT < 0.6 : false;

  var newPanel = renderPanel(info, isDimmed, scrollOffset, boxWidth);

  return e(Box, { flexDirection: 'column', marginLeft: 2 },
    oldPanel,
    newPanel
  );
}

module.exports = { SidePanel };
