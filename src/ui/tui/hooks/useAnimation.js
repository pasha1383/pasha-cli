'use strict';

const React = require('react');

let _clock = null;
let _reducedMotion = null;
let _fpsCap = 30;
let _forceTTY = false;

function _detectReducedMotion() {
  if (process.env.NO_MOTION || process.env.REDUCED_MOTION) return true;
  if (process.env.CI) return true;
  return false;
}

function _isTTY() {
  if (_forceTTY) return true;
  try {
    return process.stdout.isTTY && process.stdin.isTTY;
  } catch (_) {
    return false;
  }
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

function setForceMode(val) {
  _forceTTY = !!val;
}

function setClock(fn) {
  _clock = fn;
}

function setFpsCap(val) {
  _fpsCap = val;
}

function _now() {
  return (_clock || Date.now)();
}

function useAnimation({ fps, autoStart } = {}) {
  const frameRate = fps || _fpsCap;
  const minInterval = 1000 / Math.min(frameRate, _fpsCap);

  const [frame, setFrame] = React.useState(0);
  const [running, setRunning] = React.useState(autoStart !== false);

  const frameRef = React.useRef(frame);
  const runningRef = React.useRef(running);
  const lastRef = React.useRef(0);
  const intervalRef = React.useRef(null);
  const enabled = isAnimationEnabled();

  React.useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  React.useEffect(() => {
    runningRef.current = running;
  }, [running]);

  React.useEffect(() => {
    if (!enabled) return;

    lastRef.current = _now();

    function tick() {
      if (!runningRef.current) return;
      const time = _now();
      const elapsed = time - lastRef.current;
      if (elapsed < 0) {
        lastRef.current = time;
        return;
      }
      if (elapsed >= minInterval) {
        const frames = Math.floor(elapsed / minInterval);
        lastRef.current += frames * minInterval;
        frameRef.current += frames;
        setFrame(frameRef.current);
      }
    }

    intervalRef.current = setInterval(tick, Math.max(1, Math.floor(minInterval / 2)));

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, minInterval]);

  const start = React.useCallback(() => {
    lastRef.current = _now();
    setRunning(true);
  }, []);

  const stop = React.useCallback(() => {
    setRunning(false);
  }, []);

  const reset = React.useCallback(() => {
    lastRef.current = _now();
    frameRef.current = 0;
    setFrame(0);
    setRunning(true);
  }, []);

  return { frame, running, start, stop, reset, enabled };
}

module.exports = { useAnimation, isAnimationEnabled, disableAnimation, enableAnimation, setClock, setFpsCap, setForceMode };
