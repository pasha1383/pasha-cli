'use strict';

const React = require('react');
const { getInk } = require('../ink-proxy');
const { Spinner } = require('./Spinner');
const e = React.createElement;

const CHECK = '\u2713';
const CROSS = '\u2717';
const WARN = '\u26A0';
const ARROW = '\u276F';

function PrereqsScreen({ initialResults, installTool, onDone }) {
  const { Text, Box, useInput } = getInk();

  const [tools, setTools] = React.useState(() =>
    initialResults.map(r => ({
      tool: r.tool,
      status: r.installed ? 'ok' : 'missing',
      error: null,
    }))
  );
  const [phase, setPhase] = React.useState('idle');
  const [confirmSelected, setConfirmSelected] = React.useState(true);
  const [installingIdx, setInstallingIdx] = React.useState(-1);

  const hasMissing = tools.some(t => t.status === 'missing');
  const missingCount = tools.filter(t => t.status === 'missing').length;

  React.useEffect(() => {
    if (!hasMissing) {
      const timer = setTimeout(() => onDone(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  React.useEffect(() => {
    if (hasMissing && phase === 'idle') {
      const timer = setTimeout(() => setPhase('confirming'), 300);
      return () => clearTimeout(timer);
    }
  }, [hasMissing, phase]);

  useInput(function (input, key) {
    const isCtrlC = key.ctrl && !key.meta && (input === 'c' || input === '\x03');
    if (isCtrlC) {
      // Footer advertises Ctrl+C as "Skip" here — skip whatever prerequisite
      // work is outstanding and let the wizard continue, regardless of phase.
      const allOk = tools.every(t => t.status === 'ok');
      onDone(allOk);
      return;
    }

    if (phase !== 'confirming') return;

    if (key.leftArrow || key.rightArrow) {
      setConfirmSelected(prev => !prev);
      return;
    }
    if (input === 'y' || input === 'Y') {
      setConfirmSelected(true);
      return;
    }
    if (input === 'n' || input === 'N') {
      setConfirmSelected(false);
      return;
    }
    if (key.return) {
      if (confirmSelected) {
        setPhase('installing');
      } else {
        onDone(false);
      }
      return;
    }
  });

  React.useEffect(() => {
    if (phase !== 'installing') return;

    let cancelled = false;

    async function run() {
      const missing = tools
        .map((t, i) => ({ ...t, idx: i }))
        .filter(t => t.status === 'missing');

      for (const item of missing) {
        if (cancelled) break;
        setInstallingIdx(item.idx);
        try {
          await installTool(item.tool);
          if (!cancelled) {
            setTools(prev => {
              const next = [...prev];
              next[item.idx] = { ...next[item.idx], status: 'ok' };
              return next;
            });
          }
        } catch (err) {
          if (!cancelled) {
            setTools(prev => {
              const next = [...prev];
              next[item.idx] = { ...next[item.idx], status: 'failed', error: err.message };
              return next;
            });
          }
        }
      }
      if (!cancelled) {
        setInstallingIdx(-1);
        setPhase('done');
      }
    }

    run();
    return () => { cancelled = true; };
  }, [phase === 'installing']);

  React.useEffect(() => {
    if (phase === 'done') {
      const allOk = tools.every(t => t.status === 'ok');
      const timer = setTimeout(() => onDone(allOk), allOk ? 800 : 1500);
      return () => clearTimeout(timer);
    }
  }, [phase === 'done']);

  const toolElements = tools.map((t, i) => {
    if (phase === 'installing' && i === installingIdx) {
      return e(Box, { key: i, flexDirection: 'row' },
        e(Text, { color: 'cyan' }, '  '),
        e(Spinner, { color: 'cyan' }),
        e(Text, { color: 'cyan', bold: true }, ' ' + t.tool),
        e(Text, { dimColor: true, color: 'gray' }, ' — installing...'),
      );
    }

    if (t.status === 'ok') {
      return e(Box, { key: i, flexDirection: 'row' },
        e(Text, { color: 'green' }, '  ' + CHECK + ' '),
        e(Text, { color: 'green' }, t.tool),
      );
    }

    if (t.status === 'missing') {
      return e(Box, { key: i, flexDirection: 'row' },
        e(Text, { color: 'red' }, '  ' + CROSS + ' '),
        e(Text, { color: 'white' }, t.tool),
        e(Text, { dimColor: true, color: 'gray' }, ' — not found'),
      );
    }

    if (t.status === 'failed') {
      return e(Box, { key: i, flexDirection: 'row' },
        e(Text, { color: 'red' }, '  ' + CROSS + ' '),
        e(Text, { color: 'white' }, t.tool),
        e(Text, { dimColor: true, color: 'red' }, ' — install failed'),
      );
    }

    return null;
  });

  let bottomEl = null;

  if (phase === 'confirming') {
    bottomEl = e(Box, { flexDirection: 'column', marginTop: 2 },
      e(Box, { borderStyle: 'single', borderColor: 'yellow', paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1, flexDirection: 'column' },
        e(Text, { bold: true, color: 'yellow' }, WARN + ' ' + missingCount + ' tool' + (missingCount > 1 ? 's are' : ' is') + ' missing. Install now?'),
        e(Box, { flexDirection: 'row', marginTop: 1 },
          e(Text, {}, '  '),
          e(Text, { color: confirmSelected ? 'cyan' : 'gray' }, confirmSelected ? ARROW : ' '),
          e(Text, { color: 'white', bold: confirmSelected }, ' Yes' + (confirmSelected ? '  (default)' : '')),
        ),
        e(Box, { flexDirection: 'row' },
          e(Text, {}, '  '),
          e(Text, { color: !confirmSelected ? 'cyan' : 'gray' }, !confirmSelected ? ARROW : ' '),
          e(Text, { color: 'white', bold: !confirmSelected }, ' No'),
        ),
      ),
    );
  }

  if (phase === 'installing') {
    bottomEl = e(Box, { marginTop: 2 },
      e(Text, { dimColor: true, color: 'gray' }, '  Installing missing tools...'),
    );
  }

  if (phase === 'done') {
    const allOk = tools.every(t => t.status === 'ok');
    if (allOk) {
      bottomEl = e(Box, { marginTop: 2 },
        e(Text, { color: 'green', bold: true }, '  ' + CHECK + ' All prerequisites satisfied'),
      );
    } else {
      bottomEl = e(Box, { marginTop: 2 },
        e(Text, { color: 'yellow', bold: true }, '  ' + WARN + ' Some tools could not be installed. Continuing without them.'),
      );
    }
  }

  return e(Box, { flexDirection: 'column', paddingTop: 2 },
    e(Text, { bold: true, color: 'white' }, '  Prerequisites'),
    e(Box, { flexDirection: 'column', marginTop: 1 }, ...toolElements),
    bottomEl,
  );
}

module.exports = { PrereqsScreen };
