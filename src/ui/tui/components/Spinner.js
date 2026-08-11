'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation, isAnimationEnabled } = require('../hooks/useAnimation');
const e = React.createElement;

const BRAILLE_FRAMES = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];
const ASCII_FRAMES = ['|', '/', '-', '\\'];

function _supportsUnicode() {
  try {
    return process.stdout.encoding ? true : (process.env.TERM || '').includes('256color') || process.env.LANG ? /UTF-?8/i.test(process.env.LANG) : true;
  } catch (_) { return true; }
}

function _frameCount() {
  return _supportsUnicode() ? 10 : 4;
}

function _frames() {
  return _supportsUnicode() ? BRAILLE_FRAMES : ASCII_FRAMES;
}

function Spinner({ color }) {
  const { Text } = getInk();
  const { frame, running } = useAnimation({ fps: 10 });
  const enabled = isAnimationEnabled();

  const frames = _frames();
  const idx = enabled && running ? frame % frames.length : 0;
  const char = frames[idx];

  return e(Text, { color: color || 'cyan' }, char);
}

Spinner.frameCount = _frameCount;
Spinner.frames = _frames;

module.exports = { Spinner };
