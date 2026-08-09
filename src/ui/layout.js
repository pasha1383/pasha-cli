'use strict';
const { W, H, V, TL, TR, BL, BR, T_, _T, COLORS } = require('./theme');

function strip(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, '');
}

function displayWidth(s) {
  let width = 0;
  const clean = strip(s);
  for (const ch of clean) {
    const code = ch.codePointAt(0);
    if (code >= 0x1100 && (
      (code <= 0x115f) || code === 0x2329 || code === 0x232a ||
      (code >= 0x2e80 && code <= 0x303e) ||
      (code >= 0x3040 && code <= 0x33bf) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x4e00 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff01 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1f64f) ||
      (code >= 0x1f680 && code <= 0x1f6ff) ||
      (code >= 0x1f900 && code <= 0x1f9ff)
    )) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

function bar(ch) { return (ch || H).repeat(W); }
function padR(text, width) { const len = displayWidth(text); return text + ' '.repeat(Math.max(0, width - len)); }
function padC(text, width) { const len = displayWidth(text); const left = Math.max(0, Math.floor((width - len) / 2)); return ' '.repeat(left) + text + ' '.repeat(Math.max(0, width - len - left)); }
function row(content) { return COLORS.primary(V) + padR(content, W) + COLORS.primary(V); }

function wrapLine(text, maxWidth) {
  const clean = strip(text);
  if (displayWidth(clean) <= maxWidth) return [text];
  const words = text.split(/(\s+)/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (displayWidth(strip(current + word)) <= maxWidth) {
      current += word;
    } else {
      if (current) lines.push(current);
      current = word.trimStart();
    }
  }
  if (current) lines.push(current);
  return lines;
}

function truncate(text, maxWidth) {
  const clean = strip(text);
  if (displayWidth(clean) <= maxWidth) return text;
  return clean.slice(0, maxWidth - 3) + '...';
}

const BOX = { TL, TR, BL, BR, T_, _T, V, H };

module.exports = { strip, displayWidth, bar, padR, padC, row, wrapLine, truncate, BOX, W };
