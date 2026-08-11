'use strict';

const React = require('react');

let _clock = null;
let _reducedMotion = null;
let _fpsCap = 30;

function _detectReducedMotion() {
  if (process.env.NO_MOTION || process.env.REDUCED_MOTION) return true;
  if (process.env.CI) return true;
  return false;
}

function _isTTY() {
  return process.stdout.isTTY && process.stdin.isTTY;
}

function isAnimationEnabled() {
  if (_reducedMotion !== null) return !_reducedMotion;
  _reducedMotion = _detectReducedMotion() || !_isTTY();
  return !_reducedMotion;
}

function disableAnimation() {
  _reducedMotion = true;
}

function enableAnimation() {
  _reducedMotion = false;
}

function setClock(fn) {
  _clock = fn;
}

function setFpsCap(val) {
  _fpsCap = val;
}

function useAnimation({ fps, autoStart } = {}) {
  const frameRate = fps || _fpsCap;
  const minInterval = 1000 / Math.min(frameRate, _fpsCap);

  const [frame, setFrame] = React.useState(0);
  const [running, setRunning] = React.useState(autoStart !== false);

  const frameRef = React.useRef(frame);
  const runningRef = React.useRef(running);
  const lastRef = React.useRef(0);
  const rafRef = React.useRef(null);
  const enabled = isAnimationEnabled();

  React.useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  React.useEffect(() => {
    runningRef.current = running;
  }, [running]);

  React.useEffect(() => {
    if (!enabled) return;

    const now = _clock ? _clock() : Date.now;

    function tick(time) {
      if (!runningRef.current) return;
      const elapsed = time - lastRef.current;
      if (elapsed >= minInterval) {
        lastRef.current = time;
        frameRef.current = frameRef.current + 1;
        setFrame(frameRef.current);
      }
      rafRef.current = setTimeout(function () { tick(now()); }, Math.max(1, Math.floor(minInterval * 0.5)));
    }

    lastRef.current = now();
    rafRef.current = setTimeout(function () { tick(now()); }, Math.floor(minInterval * 0.5));

    return function () {
      if (rafRef.current) {
        clearTimeout(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, minInterval]);

  const start = React.useCallback(function () {
    setRunning(true);
  }, []);

  const stop = React.useCallback(function () {
    setRunning(false);
  }, []);

  const reset = React.useCallback(function () {
    frameRef.current = 0;
    setFrame(0);
    setRunning(true);
  }, []);

  return { frame, running, start, stop, reset, enabled };
}

module.exports = { useAnimation, isAnimationEnabled, disableAnimation, enableAnimation, setClock, setFpsCap };
