'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation, isAnimationEnabled } = require('../hooks/useAnimation');
const e = React.createElement;

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function SidePanel({ title, description, visible }) {
  if (!visible || (!title && !description)) return null;

  const { Text, Box } = getInk();
  const animate = useAnimation({ fps: 30 });
  const enabled = isAnimationEnabled();

  var opacity = 1;
  if (enabled) {
    var t = Math.min(1, animate.frame / 10);
    opacity = 0.3 + 0.7 * Math.min(1, t);
  }

  const boxWidth = 40;
  const lines = [];

  if (title) lines.push(title);

  if (description) {
    const maxLineLen = boxWidth - 4;
    const words = description.split(/\s+/);
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length > maxLineLen && line.length > 0) {
        lines.push(line.trim());
        line = word;
      } else {
        line = (line + ' ' + word).trim();
      }
    }
    if (line) lines.push(line.trim());
  }

  const top = '\u250C' + '\u2500'.repeat(boxWidth - 2) + '\u2510';
  const bottom = '\u2514' + '\u2500'.repeat(boxWidth - 2) + '\u2518';

  const dimmed = opacity < 0.9;

  const lineElements = lines.map((line, i) =>
    e(Box, { key: i, flexDirection: 'row', width: boxWidth },
      e(Text, { color: 'cyan', dimColor: dimmed }, '\u2502'),
      e(Text, { dimColor: i > 0 || dimmed }, '  ' + line),
      e(Text, { color: 'cyan', dimColor: dimmed },
        ' '.repeat(Math.max(0, boxWidth - 4 - stripAnsi(line))) + '\u2502')
    )
  );

  return e(Box, { flexDirection: 'column', marginLeft: 2, width: boxWidth, flexShrink: 0 },
    e(Text, { color: 'cyan', dimColor: dimmed }, top),
    ...lineElements,
    e(Text, { color: 'cyan', dimColor: dimmed }, bottom)
  );
}

module.exports = { SidePanel };
