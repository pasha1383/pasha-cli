'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation, isAnimationEnabled } = require('../hooks/useAnimation');
const archDescriptions = require('../arch-descriptions');
const e = React.createElement;

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

const BOX_WIDTH = 46;
const CROSSFADE_FRAMES = 10;

function wrapLines(text, maxLen) {
  var words = text.split(/\s+/);
  var lines = [];
  var line = '';
  for (var wi = 0; wi < words.length; wi++) {
    var word = words[wi];
    if ((line + ' ' + word).trim().length > maxLen && line.length > 0) {
      lines.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function buildSectionLines(sectionLabel, text, maxLen) {
  var lines = [];
  if (sectionLabel) lines.push(sectionLabel);
  var body = wrapLines(text, maxLen);
  for (var i = 0; i < body.length; i++) lines.push(body[i]);
  lines.push('');
  return lines;
}

function buildFullLines(boxInfo, maxLineLen) {
  var lines = [];
  lines.push(boxInfo.title);
  lines.push('');

  var descLines = buildSectionLines(null, boxInfo.description, maxLineLen - 2);
  for (var d = 0; d < descLines.length; d++) lines.push(descLines[d]);

  if (boxInfo.bestFor) {
    var bestLines = buildSectionLines('Best for:', boxInfo.bestFor, maxLineLen - 2);
    for (var b = 0; b < bestLines.length; b++) lines.push(bestLines[b]);
  }

  if (boxInfo.files) {
    var fileLines = buildSectionLines('File structure:', boxInfo.files, maxLineLen - 2);
    for (var f = 0; f < fileLines.length; f++) lines.push(fileLines[f]);
  }

  return lines;
}

function renderPanelBox(boxInfo, isPrev, animFrame, crossfadeT, animEnabled, boxWidth) {
  if (!boxInfo) return null;

  var { Text, Box } = getInk();

  var maxLineLen = boxWidth - 4;
  var lines = buildFullLines(boxInfo, maxLineLen);

  var dimmed;
  if (isPrev) {
    dimmed = true;
  } else if (animEnabled) {
    dimmed = crossfadeT < 0.6;
  } else {
    dimmed = false;
  }

  var lineColor = isPrev ? 'gray' : 'cyan';
  var labelColor = isPrev ? 'gray' : 'magenta';
  var titleColor = isPrev ? 'gray' : 'green';

  var lineElements = lines.map(function (line, i) {
    var isTitle = line === boxInfo.title;
    var isLabel = line && (line.startsWith('Best for:') || line.startsWith('File structure:'));

    return e(Box, { key: i, flexDirection: 'row', width: boxWidth },
      e(Text, { color: lineColor, dimColor: isPrev }, '\u2502'),
      e(Text, {
        dimColor: isPrev,
        bold: isTitle || isLabel,
        color: isTitle ? titleColor : (isLabel ? labelColor : undefined),
      }, '  ' + line),
      e(Text, { color: lineColor, dimColor: isPrev },
        ' '.repeat(Math.max(0, boxWidth - 4 - stripAnsi(line))) + '\u2502')
    );
  });

  var top = '\u250C' + '\u2500'.repeat(boxWidth - 2) + '\u2510';
  var bottom = '\u2514' + '\u2500'.repeat(boxWidth - 2) + '\u2518';

  return e(Box, { flexDirection: 'column', width: boxWidth, flexShrink: 0 },
    e(Text, { color: lineColor, dimColor: isPrev }, top),
    ...lineElements,
    e(Text, { color: lineColor, dimColor: isPrev }, bottom)
  );
}

function SidePanel({ architecture, visible }) {
  if (!visible || !architecture) return null;

  var info = archDescriptions[architecture];
  if (!info) return null;

  var anim = useAnimation({ fps: 30 });
  var animEnabled = isAnimationEnabled();

  var transitionRef = React.useRef({ startFrame: 0, prevInfo: null });
  var prevArchRef = React.useRef(architecture);

  if (architecture !== prevArchRef.current && animEnabled) {
    if (prevArchRef.current && archDescriptions[prevArchRef.current]) {
      transitionRef.current = {
        startFrame: anim.frame,
        prevInfo: archDescriptions[prevArchRef.current],
      };
    } else {
      transitionRef.current = { startFrame: 0, prevInfo: null };
    }
    prevArchRef.current = architecture;
  }

  var showPrev = false;
  var crossfadeT = 1;
  if (transitionRef.current.startFrame > 0 && animEnabled) {
    var elapsed = anim.frame - transitionRef.current.startFrame;
    if (elapsed < CROSSFADE_FRAMES) {
      showPrev = true;
      crossfadeT = elapsed / CROSSFADE_FRAMES;
    } else {
      transitionRef.current = { startFrame: 0, prevInfo: null };
    }
  }

  return e(Box, { flexDirection: 'column', marginLeft: 2 },
    showPrev ? renderPanelBox(transitionRef.current.prevInfo, true, anim.frame, crossfadeT, animEnabled, BOX_WIDTH) : null,
    renderPanelBox(info, false, anim.frame, crossfadeT, animEnabled, BOX_WIDTH)
  );
}

module.exports = { SidePanel };
