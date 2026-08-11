'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation, isAnimationEnabled } = require('../hooks/useAnimation');
const archDescriptions = require('../arch-descriptions');
const e = React.createElement;

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function visualLength(str) {
  return stripAnsi(str).length;
}

var BASE_WIDTH = 46;
var WIDE_THRESHOLD = 120;
var CROSSFADE_FRAMES = 10;

var SECTION_TITLE = 'title';
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
  return Math.max(8, rows - 6);
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

function buildTaggedLines(boxInfo, innerWidth) {
  var lines = [];

  lines.push({ text: boxInfo.title, section: SECTION_TITLE });
  lines.push({ text: '', section: SECTION_BLANK });

  lines.push({ text: 'What is this?', section: SECTION_HEADER });

  var descBody = wrapLines(boxInfo.description, innerWidth);
  for (var di = 0; di < descBody.length; di++) {
    lines.push({ text: descBody[di], section: SECTION_DESC });
  }
  lines.push({ text: '', section: SECTION_BLANK });

  if (boxInfo.bestFor) {
    var bestBody = wrapLines(boxInfo.bestFor, innerWidth);
    lines.push({ text: 'Best for:', section: SECTION_HEADER });
    for (var bi = 0; bi < bestBody.length; bi++) {
      lines.push({ text: bestBody[bi], section: SECTION_DESC });
    }
    lines.push({ text: '', section: SECTION_BLANK });
  }

  if (boxInfo.files) {
    var fileBody = wrapLines(boxInfo.files, innerWidth);
    lines.push({ text: 'File structure:', section: SECTION_HEADER });
    for (var fi = 0; fi < fileBody.length; fi++) {
      lines.push({ text: fileBody[fi], section: SECTION_CONTENT });
    }
    lines.push({ text: '', section: SECTION_BLANK });
  }

  return lines;
}

function renderPanelFrame(boxInfo, isOld, crossfadeT, animEnabled, boxWidth) {
  if (!boxInfo) return null;

  var ink = getInk();
  var Text = ink.Text;
  var Box = ink.Box;

  var innerWidth = Math.max(10, boxWidth - 5);
  var taggedLines = buildTaggedLines(boxInfo, innerWidth);

  var isDimmed;
  if (isOld) {
    isDimmed = true;
  } else if (animEnabled && crossfadeT < 1) {
    isDimmed = crossfadeT < 0.6;
  } else {
    isDimmed = false;
  }

  var borderColor = isOld ? 'gray' : 'cyan';
  var dimDefault = isDimmed;

  var lineElements = [];

  for (var i = 0; i < taggedLines.length; i++) {
    var item = taggedLines[i];
    var line = item.text;
    var section = item.section;

    var color;
    var bold = false;
    var dim = dimDefault;

    if (section === SECTION_TITLE) {
      color = dimDefault ? 'gray' : 'cyan';
      bold = true;
    } else if (section === SECTION_HEADER) {
      color = dimDefault ? 'gray' : 'yellow';
      bold = true;
    } else if (section === SECTION_CONTENT) {
      color = dimDefault ? 'gray' : undefined;
      dim = true;
    } else if (section === SECTION_BLANK || section === SECTION_DESC) {
      color = dimDefault ? 'gray' : undefined;
    }

    var isBlank = line.length === 0;
    var pad = Math.max(0, innerWidth - visualLength(line));
    var content = isBlank ? '' : '  ' + line + ' '.repeat(pad);

    lineElements.push(
      e(Box, { key: i, flexDirection: 'row', width: boxWidth },
        e(Text, { color: borderColor, dimColor: dimDefault }, '\u2502'),
        e(Text, { dimColor: dim, bold: bold, color: color }, content),
        e(Text, { color: borderColor, dimColor: dimDefault }, '\u2502')
      )
    );
  }

  var topBorder = '\u250C' + '\u2500'.repeat(boxWidth - 2) + '\u2510';
  var bottomBorder = '\u2514' + '\u2500'.repeat(boxWidth - 2) + '\u2518';

  var maxLines = getMaxVisibleLines();
  var panelHeight = Math.min(maxLines, taggedLines.length + 2);

  return e(Box, {
    flexDirection: 'column',
    width: boxWidth,
    flexShrink: 0,
    height: panelHeight,
    overflow: 'hidden',
  },
    e(Text, { color: borderColor, dimColor: dimDefault }, topBorder),
    ...lineElements,
    e(Text, { color: borderColor, dimColor: dimDefault }, bottomBorder)
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
    var innerW = Math.max(10, boxWidth - 5);
    var msg = 'Select an option to see details';
    var padTotal = Math.max(0, innerW - msg.length);
    var padLeft = Math.floor(padTotal / 2);
    var padRight = padTotal - padLeft;

    var phTop = '\u250C' + '\u2500'.repeat(boxWidth - 2) + '\u2510';
    var phBottom = '\u2514' + '\u2500'.repeat(boxWidth - 2) + '\u2518';

    return e(Box, { flexDirection: 'column', marginLeft: 2, width: boxWidth, flexShrink: 0 },
      e(Text, { color: 'cyan' }, phTop),
      e(Box, { flexDirection: 'row', width: boxWidth },
        e(Text, { color: 'cyan' }, '\u2502'),
        e(Text, { dimColor: true }, '  ' + ' '.repeat(padLeft) + msg + ' '.repeat(padRight)),
        e(Text, { color: 'cyan' }, '\u2502')
      ),
      e(Text, { color: 'cyan' }, phBottom)
    );
  }

  var oldPanel = showOld && oldInfo
    ? renderPanelFrame(oldInfo, true, crossfadeT, animEnabled, boxWidth)
    : null;

  var newPanel = renderPanelFrame(info, false, crossfadeT, animEnabled, boxWidth);

  return e(Box, { flexDirection: 'column', marginLeft: 2 },
    oldPanel,
    newPanel
  );
}

module.exports = { SidePanel };
