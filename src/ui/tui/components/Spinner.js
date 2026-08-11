'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { useAnimation } = require('../hooks/useAnimation');
const e = React.createElement;

const BRAILLE_FRAMES = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];
const ASCII_FRAMES = ['|', '/', '-', '\\'];

function _supportsUnicode() {
  try {
    return process.stdout.encoding ? true : (process.env.TERM || '').includes('256color') || process.env.LANG ? /UTF-?8/i.test(process.env.LANG) : true;
  } catch (_) { return true; }
}

function _isAsciiTerminal() {
  return process.env.NO_COLOR != null || process.env.TERM === 'dumb' || !_supportsUnicode();
}

function _resolveType(type) {
  if (type === 'braille') return 'braille';
  if (type === 'ascii') return 'ascii';
  return _isAsciiTerminal() ? 'ascii' : 'braille';
}

function Spinner({ type = 'auto', color = 'cyan', size }) {
  const { Text } = getInk();
  const { frame, running, enabled } = useAnimation({ fps: 30 });

  const resolvedType = _resolveType(type);
  const frames = resolvedType === 'braille' ? BRAILLE_FRAMES : ASCII_FRAMES;
  const idx = enabled && running ? frame % frames.length : 0;
  const char = frames[idx];

  const textProps = { color };
  if (size != null) textProps.size = size;

  return e(Text, textProps, char);
}

module.exports = { Spinner, BRAILLE_FRAMES, ASCII_FRAMES };
