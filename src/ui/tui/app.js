'use strict';

var React = require('react');
var pkg = require('../../../package.json');
var { getInk } = require('./ink-proxy');
var { StepRail } = require('./components/StepRail');
var { KeyHints } = require('./components/KeyHints');
var { SidePanel, getPanelWidth } = require('./components/SidePanel');
var archDescriptions = require('./arch-descriptions');
var { SelectPrompt } = require('./components/SelectPrompt');
var { MultiSelectPrompt } = require('./components/MultiSelectPrompt');
var { InputPrompt } = require('./components/InputPrompt');
var { ConfirmPrompt } = require('./components/ConfirmPrompt');
var { SummaryScreen } = require('./components/SummaryScreen');
var { ProgressScreen } = require('./components/ProgressScreen');
var { PrereqsScreen } = require('./components/PrereqsScreen');
var { HelpOverlay } = require('./components/HelpOverlay');
var { hintsForContext, mapKey } = require('./keymap');
var { onResize, restore: restoreTerminal, saveSummary: terminalSaveSummary } = require('./terminal');
var { theme } = require('./theme');
var e = React.createElement;

var COMPACT_COLS = 60;
var COMPACT_ROWS = 15;

var _resolve = null;
var _queue = [];
var _onStateChange = null;
var _appState = null;
var _previousView = null;
var _answerHistory = [];
var _navigator = null;

function getState() {
  return _appState;
}

// Ink tracks how many terminal rows the previous frame occupied and
// erases exactly that many before writing the next one, via log-update's
// own internal bookkeeping. Any change that alters the frame's total
// height -- a view transition, but just as easily the side panel
// swinging between its short "no description" placeholder and its full
// padded content as the highlighted choice changes -- can leave that
// bookkeeping out of sync, leaving stale rows from the old frame on
// screen above the new content.
//
// Forcing a clear with a *raw* ANSI write here (bypassing Ink) was tried
// first and made things worse: Ink/log-update still believes the cursor
// is wherever its own internal count last left it, so its next write is
// positioned relative to that stale belief rather than the real (reset)
// cursor position, pushing content further down or off-screen entirely.
// ink.render()'s returned instance exposes clear() for exactly this --
// it resets log-update's own tracking, not just the physical terminal --
// so create.js wires it in via setClearFn() once the instance exists.
var _clearFn = null;
function setClearFn(fn) {
  _clearFn = fn;
}
function clearScreenForRedraw() {
  if (_clearFn) {
    try { _clearFn(); } catch (_) {}
  }
}

function setState(update) {
  var viewChanged = update.view !== undefined && (!_appState || update.view !== _appState.view);
  if (viewChanged) clearScreenForRedraw();
  _appState = Object.assign({}, _appState || {}, update);
  if (_onStateChange) _onStateChange(_appState);
}

var _cancelled = false;

function pushQuestion(question, resolve) {
  if (_cancelled) {
    resolve({});
    return;
  }
  _answerHistory.push({
    question: question,
    resolve: resolve,
  });
  _queue.push({ question: question, resolve: resolve });
  if (_queue.length === 1) {
    _previousView = _appState ? _appState.view : null;
    _showCurrentQuestion();
  }
}

function hasAnswers(answers) {
  if (!answers) return false;
  var keys = Object.keys(answers);
  for (var i = 0; i < keys.length; i++) {
    var v = answers[keys[i]];
    if (v !== undefined && v !== null && v !== '') return true;
  }
  return false;
}

function _showCurrentQuestion() {
  if (_queue.length === 0) return;
  var item = _queue[0];
  _resolve = item.resolve;
  var q = item.question;
  setState({
    view: 'question',
    questionType: q.type,
    message: q.message,
    choices: q.choices || [],
    defaultValue: q.default,
    validate: q.validate,
    answers: q.answers || {},
    stepIndex: q.stepIndex || 0,
    totalSteps: q.totalSteps || 1,
    stepLabel: q.stepLabel || '',
    sidebarInfo: q.sidebarInfo || null,
  });
}

function _answer(value) {
  var item = _queue.shift();
  _resolve = null;
  if (item && item.resolve) {
    item.resolve(value);
  }
  if (_queue.length > 0) {
    _showCurrentQuestion();
  } else {
    var restoreView = _previousView || 'idle';
    _previousView = null;
    setState({
      view: restoreView,
      questionType: null,
      message: '',
      choices: [],
      answers: getState().answers || {},
      summaryContext: null,
    });
  }
}

function _goBack() {
  if (_queue.length === 0) return;

  if (_navigator && !_navigator.goBack()) {
    return;
  }

  var item = _queue.shift();
  _resolve = null;
  if (item && item.resolve) {
    item.resolve('__back__');
  }

  _queue = [];
  _answerHistory = [];
  _previousView = null;
  setState({
    view: 'idle',
    questionType: null,
    message: '',
    choices: [],
    answers: getState().answers || {},
    summaryContext: null,
  });
}

function showProgress(phases, currentPhase, message) {
  setState({
    view: 'progress',
    phases: phases,
    currentPhase: currentPhase,
    progressMessage: message,
  });
}

function updateProgress(update) {
  if (!_appState || _appState.view !== 'progress') return;
  var merged = Object.assign({}, _appState, update);
  setState(merged);
}

function showSummary(context, opts) {
  var callbacks = typeof opts === 'function' ? { onEdit: opts } : (opts || {});
  setState({
    view: 'summary',
    summaryContext: context,
    onEdit: callbacks.onEdit || null,
    onGenerate: callbacks.onGenerate || null,
    onBack: callbacks.onBack || null,
  });
}

function _showSummaryFromCurrent() {
  var priorState = getState();
  if (priorState.view === 'summary') return;
  // This is a read-only preview of answers-so-far (triggered by the
  // "Skip to summary" shortcut mid-wizard) -- there's no onGenerate here
  // because the remaining questions haven't been asked yet, so
  // generating now would silently use incomplete/default answers.
  // Wire onBack to actually restore the step the user was on, rather
  // than leaving Back/Escape as a silent no-op.
  showSummary(priorState.answers || {}, {
    onBack: function () { setState(priorState); },
  });
}

var _prereqsProps = null;

function showPrereqsScreen(tools, installTool, onResolve) {
  _prereqsProps = {
    initialResults: tools,
    installTool: installTool,
    onDone: function (allOk) {
      _prereqsProps = null;
      setState({ view: 'idle' });
      if (onResolve) onResolve(allOk);
    },
  };
  setState({ view: 'prereqs' });
}

function showDone(message, outPath, ctx) {
  setState({
    view: 'done',
    doneMessage: message,
    doneOutPath: outPath || null,
    doneCtx: ctx || null,
    doneTime: Date.now(),
  });
}

function cancelAll() {
  if (_resolve) {
    _resolve('__cancel__');
    _resolve = null;
  }
  _queue = [];
  _answerHistory = [];
  _previousView = null;
  setState({
    view: 'idle',
    questionType: null,
    message: '',
    choices: [],
    answers: {},
  });
}

function setNavigator(nav) {
  _navigator = nav;
}

var STEPS = [
  { name: 'mode', label: 'Mode' },
  { name: 'language', label: 'Language' },
  { name: 'framework', label: 'Framework' },
  { name: 'architecture', label: 'Architecture' },
  { name: 'prereqs', label: 'Prereqs' },
  { name: 'project', label: 'Project' },
  { name: 'stack', label: 'Stack' },
  { name: 'modules', label: 'Modules' },
  { name: 'review', label: 'Review' },
];

var LOGO_SHORT = [
  '  ____  _   _   _    ____    _    ____ ',
  ' |  _ \\| | | | / \\  / ___|  / \\  / ___|',
  ' | |_) | |_| |/ _ \\ \\___ \\ / _ \\ \\___ \\',
  ' |_|   |_| |_/_/ __\\_\\____/_/ __\\_\\____/',
];

var ErrorBoundary = (function () {
  function FallbackView(props) {
    try {
      var ink = getInk();
      return e(ink.Box, { flexDirection: 'column', paddingTop: 2, paddingLeft: 1 },
        e(ink.Text, { bold: true, color: theme.error }, 'Fatal Error'),
        e(ink.Box, { marginTop: 1 },
          e(ink.Text, { color: theme.error }, String(props.error && props.error.message ? props.error.message : 'Unknown error'))
        ),
        e(ink.Box, { marginTop: 1 },
          e(ink.Text, { dimColor: true }, 'Press Ctrl+C to exit.')
        )
      );
    } catch (_e2) {
      return null;
    }
  }

  function ErrorBoundaryClass() {}
  ErrorBoundaryClass.prototype = Object.create(React.Component.prototype);
  ErrorBoundaryClass.prototype.constructor = ErrorBoundaryClass;
  ErrorBoundaryClass.prototype.render = function () {
    if (this.state && this.state.hasError) {
      return e(FallbackView, { error: this.state.error });
    }
    return this.props.children;
  };

  var staticMethods = {
    getDerivedStateFromError: function (error) {
      return { hasError: true, error: error };
    }
  };
  ErrorBoundaryClass.prototype.componentDidCatch = function (error, errorInfo) {
    if (typeof console.error === 'function') {
      console.error('TUI crashed:', error && error.message, errorInfo);
    }
  };

  Object.keys(staticMethods).forEach(function (k) {
    Object.defineProperty(ErrorBoundaryClass, k, {
      value: staticMethods[k],
      writable: true,
      configurable: true
    });
  });

  return ErrorBoundaryClass;
})();

function App() {
  var { Text, Box, useInput, useApp } = getInk();
  var { exit } = useApp();
  var _a = React.useState(function () {
    return _appState || {
      view: 'welcome',
      questionType: null,
      message: '',
      choices: [],
      answers: {},
      stepIndex: 0,
      totalSteps: 1,
      stepLabel: '',
      sidebarInfo: null,
      summaryContext: null,
    };
  });
  var state = _a[0];
  var setLocalState = _a[1];

  var _b = React.useState(false);
  var welcomeDismissed = _b[0];
  var setWelcomeDismissed = _b[1];
  var _c = React.useState(null);
  var highlightedArch = _c[0];
  var setHighlightedArch = _c[1];
  var _d = React.useState(0);
  var doneAnimFrame = _d[0];
  var setDoneAnimFrame = _d[1];

  var _e = React.useState(false);
  var helpVisible = _e[0];
  var setHelpVisible = _e[1];
  var _f = React.useState(false);
  var quitConfirmVisible = _f[0];
  var setQuitConfirmVisible = _f[1];
  var _g = React.useState(0);
  var renderKey = _g[0];
  var setRenderKey = _g[1];

  function _isCompact() {
    try {
      return process.stdout.columns < COMPACT_COLS || process.stdout.rows < COMPACT_ROWS;
    } catch (_) {
      return false;
    }
  }

  var _h = React.useState(_isCompact());
  var compact = _h[0];
  var setCompact = _h[1];

  React.useEffect(function () {
    return onResize(function (cols, rows) {
      setCompact(cols < COMPACT_COLS || rows < COMPACT_ROWS);
    });
  }, []);

  React.useEffect(function () {
    _onStateChange = function (newState) {
      setLocalState(Object.assign({}, newState));
    };
    if (_queue.length > 0 && state.view === 'welcome' && !welcomeDismissed) {
      setWelcomeDismissed(true);
    }
    if (_queue.length > 0 && state.view === 'question') {
      // already in question state from pre-mount push — _onStateChange is now wired
    }
    return function () {
      _onStateChange = null;
    };
  }, []);

  var doneTimerRef = React.useRef(null);

  React.useEffect(function () {
    if (state.view === 'done') {
      setDoneAnimFrame(0);
      var count = 0;
      doneTimerRef.current = setInterval(function () {
        count++;
        setDoneAnimFrame(count);
        if (count >= 20) clearInterval(doneTimerRef.current);
      }, 30);
      return function () {
        if (doneTimerRef.current) clearInterval(doneTimerRef.current);
      };
    }
  }, [state.view === 'done']);

  var welcomeTimerRef = React.useRef(null);
  React.useEffect(function () {
    if (state.view === 'welcome' && !welcomeDismissed) {
      welcomeTimerRef.current = setTimeout(function () {
        setWelcomeDismissed(true);
      }, 600);
      return function () {
        if (welcomeTimerRef.current) {
          clearTimeout(welcomeTimerRef.current);
        }
      };
    }
  });

  React.useEffect(function () {
    if (!welcomeDismissed) return;
    if (state.view !== 'welcome' && state.view !== 'idle') return;
    if (_queue.length > 0) {
      _showCurrentQuestion();
    } else if (state.view === 'welcome') {
      setLocalState(Object.assign({}, state, { view: 'idle' }));
    }
  }, [welcomeDismissed]);

  React.useEffect(function () {
    setHighlightedArch(null);
  }, [state.choices, state.questionType]);

  function determineContext() {
    if (quitConfirmVisible) return 'confirm-quit';
    if (helpVisible) return 'help';
    if (state.view === 'done') return 'done';
    if (state.view === 'progress') return 'progress';
    if (state.view === 'prereqs') return 'prereqs';
    if (state.view === 'summary') return 'summary';
    if (state.view === 'welcome') return 'welcome';
    if (state.view === 'idle') return null;
    if (state.questionType === 'checkbox') return 'multi-select';
    if (state.questionType === 'list' || state.questionType === 'select') return 'select';
    if (state.questionType === 'input') return 'input';
    if (state.questionType === 'confirm') return 'confirm';
    return null;
  }

  function createOnKey() {
    return function (input, key) {
      var ctx = determineContext();
      if (!ctx) return;
      var action = mapKey(input, key, ctx);

      if (action === 'help') {
        setHelpVisible(function (prev) { return !prev; });
        return;
      }
      if (action === 'closeOverlay') {
        if (helpVisible) { setHelpVisible(false); return; }
        if (quitConfirmVisible) { setQuitConfirmVisible(false); return; }
        return;
      }
      if (action === 'summary') {
        _showSummaryFromCurrent();
        return;
      }
      if (action === 'back') {
        if (state.stepIndex > 0) {
          _answer('__back__');
        }
        return;
      }
      if (action === 'quit') {
        if (quitConfirmVisible) {
          _confirmQuit();
          return;
        }
        if (state.view === 'done') {
          terminalSaveSummary({ outPath: state.doneOutPath, ctx: state.doneCtx });
          exit();
          return;
        }
        if (hasAnswers(state.answers)) {
          setQuitConfirmVisible(true);
        } else {
          exit();
        }
        return;
      }
      if (action === 'redraw') {
        setRenderKey(function (k) { return k + 1; });
        return;
      }
      if (action === 'exit') {
        exit();
        return;
      }
      if (action === 'edit') {
        if (state.view === 'summary' && state.onEdit) {
          state.onEdit();
        }
        return;
      }
    };
  }

  var onKey = createOnKey();

  function _confirmQuit() {
    setQuitConfirmVisible(false);
    restoreTerminal();
    process.stdout.write('Cancelled. No files were created.\n');
    process.exit(0);
  }

  useInput(function (input, key) {
    if (state.view === 'welcome' && !welcomeDismissed) {
      setWelcomeDismissed(true);
      return;
    }

    if (quitConfirmVisible) {
      if (key.escape || input === 'n' || input === 'N') {
        setQuitConfirmVisible(false);
        return;
      }
      if (input === 'y' || input === 'Y') {
        _confirmQuit();
        return;
      }
      return;
    }

    if (helpVisible) {
      if (key.escape || input === '?') {
        setHelpVisible(false);
        return;
      }
      return;
    }

    if (state.view === 'done') {
      if (key.return) {
        terminalSaveSummary({ outPath: state.doneOutPath, ctx: state.doneCtx });
        exit();
        return;
      }
      var ctrlC = key.ctrl && !key.meta && (input === 'c' || input === '\x03');
      if (ctrlC) {
        terminalSaveSummary({ outPath: state.doneOutPath, ctx: state.doneCtx });
        exit();
        return;
      }
      return;
    }

    if (state.view === 'idle') return;

    var ctrlL = key.ctrl && !key.meta && (input === 'l' || input === '\x0c');
    if (ctrlL) {
      setRenderKey(function (k) { return k + 1; });
      return;
    }

    if (state.view === 'progress') {
      onKey(input, key);
      return;
    }

    if (state.view === 'prereqs') {
      return;
    }
  });

  function headerBreadcrumb() {
    var answers = state.answers || {};
    var parts = [];
    if (answers.languageLabel || answers.language) {
      parts.push(answers.languageLabel || answers.language);
    }
    if (answers.frameworkLabel || answers.framework) {
      parts.push(answers.frameworkLabel || answers.framework);
    }
    if (answers.architectureLabel || answers.architecture) {
      parts.push(answers.architectureLabel || answers.architecture);
    }
    return parts.length > 0 ? parts.join(' \u00B7 ') : '';
  }

  function renderHeaderBar() {
    var cols = 80;
    try { cols = process.stdout.columns || 80; } catch (_) {}

    var title = 'pasha';
    var version = 'v' + pkg.version;
    var bread = headerBreadcrumb();
    var maxWidth = Math.min(cols, 100);
    var innerWidth = maxWidth - 2;

    var topBorder = '\u250C' + '\u2500'.repeat(maxWidth - 2) + '\u2510';
    var leftText = '  ' + title + ' ' + version;
    var rightText = bread ? '  ' + bread + ' ' : '';
    var padCount = Math.max(0, innerWidth - leftText.length - rightText.length);

    return e(Box, { flexDirection: 'column' },
      e(Text, { color: theme.border }, topBorder),
      e(Box, { flexDirection: 'row', width: innerWidth, paddingLeft: 1, paddingRight: 0 },
        e(Text, { bold: true, color: theme.brand }, title),
        e(Text, { dimColor: true, color: theme.muted }, ' ' + version),
        padCount > 0 ? e(Text, { dimColor: true }, ' '.repeat(padCount)) : null,
        bread
          ? e(Text, { dimColor: true }, bread)
          : null
      ),
      e(Text, { color: theme.border }, '\u2514' + '\u2500'.repeat(maxWidth - 2) + '\u2518')
    );
  }

  function renderFooterBar() {
    var cols = 80;
    try { cols = process.stdout.columns || 80; } catch (_) {}
    var maxWidth = Math.min(cols, 100);
    return e(Text, { color: theme.border }, '\u2514' + '\u2500'.repeat(maxWidth - 2) + '\u2518');
  }

  var headerBar = renderHeaderBar();
  var footerBar = renderFooterBar();

  function renderBody() {
    if (state.view === 'welcome' && !welcomeDismissed) {
      return e(Box, { flexDirection: 'column', paddingTop: 2, alignItems: 'center' },
        e(Box, { flexDirection: 'column' },
          ...LOGO_SHORT.map(function (line, i) {
            return e(Text, { key: i, bold: true, color: theme.brand }, line);
          })
        ),
        e(Box, { marginTop: 1 },
          e(Text, { dimColor: true, color: theme.muted }, 'Multi-language / multi-architecture CLI generator'),
        ),
        e(Box, { marginTop: 2, flexDirection: 'column', alignItems: 'center' },
          e(Text, { color: theme.text }, 'Answer a few quick questions and we’ll scaffold'),
          e(Text, { color: theme.text }, 'a ready-to-run project — stack, structure, and all.'),
        ),
        e(Box, { marginTop: 2 },
          e(Text, { dimColor: true, color: theme.muted }, 'Press any key to start…'),
        ),
      );
    }

    if (state.view === 'progress') {
      return e(ProgressScreen, {
        phases: state.phases || [],
        currentPhase: state.currentPhase,
        message: state.progressMessage,
        completedPhases: state.completedPhases,
        filePath: state.filePath,
        fileCount: state.fileCount,
        fileTotal: state.fileTotal,
        failedCount: state.failedCount,
        onKey: onKey,
      });
    }

    if (state.view === 'prereqs' && _prereqsProps) {
      return e(PrereqsScreen, {
        initialResults: _prereqsProps.initialResults,
        installTool: _prereqsProps.installTool,
        onDone: _prereqsProps.onDone,
      });
    }

    if (state.view === 'summary') {
      return e(SummaryScreen, {
        context: state.summaryContext || state.answers,
        onEdit: state.onEdit || null,
        onGenerate: state.onGenerate || null,
        onBack: state.onBack || null,
        onContinue: function () {
          setLocalState(Object.assign({}, state, { view: 'idle' }));
          _showCurrentQuestion();
        },
        onKey: onKey,
      });
    }

    if (state.view === 'done') {
      var isSuccess = state.doneMessage && !/cancelled|failed/i.test(state.doneMessage);
      var dimmed = doneAnimFrame < 10;
      var ctx = state.doneCtx || {};
      var outPath = state.doneOutPath;

      var doneLines = [];

      if (isSuccess) {
        doneLines.push(
          e(Box, {},
            e(Text, { color: theme.success, bold: true, dimColor: dimmed }, '\u2713  Project Ready')
          )
        );

        if (outPath) {
          doneLines.push(
            e(Box, { marginTop: 1 },
              e(Text, { bold: true, color: theme.text, dimColor: dimmed }, '  ' + outPath)
            )
          );
        }

        var summaryParts = [ctx.languageLabel || ctx.language, ctx.frameworkLabel || ctx.framework, ctx.architectureLabel || ctx.architecture]
          .filter(Boolean);
        if (summaryParts.length) {
          doneLines.push(
            e(Box, { marginTop: 0 },
              e(Text, { dimColor: true, color: theme.muted }, '  ' + summaryParts.join(' · '))
            )
          );
        }
      } else {
        doneLines.push(
          e(Box, {},
            e(Text, { bold: true, color: theme.error, dimColor: dimmed },
              '\u2717 ' + (state.doneMessage || 'Done!')
            )
          )
        );
      }

      if (isSuccess && outPath && ctx.projectName) {
        var isNode = ctx.language === 'node';
        var isPython = ctx.language === 'python';
        var isGo = ctx.language === 'go';

        doneLines.push(
          e(Box, { marginTop: 1, flexDirection: 'column' },
            e(Text, { color: theme.border }, '  ' + '─'.repeat(28)),
            e(Text, { bold: true, color: theme.text }, 'Next steps:'),
            e(Text, { dimColor: true, color: theme.muted }, '  $ cd ' + ctx.projectName)
          )
        );

        if (isPython) {
          doneLines.push(
            e(Text, { dimColor: true, color: theme.muted }, '  $ python3 -m venv venv'),
            e(Text, { dimColor: true, color: theme.muted }, '  $ source venv/bin/activate'),
            e(Text, { dimColor: true, color: theme.muted }, '  $ pip install -r requirements.txt')
          );
          if (ctx.devRequirementsTxt) {
            doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  $ pip install -r dev-requirements.txt'));
          }
        }

        if (isGo) {
          doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  $ go mod tidy'));
        }

        if (isNode) {
          doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  $ npm install'));
        }

        if (ctx.useDocker) {
          doneLines.push(
            e(Text, { dimColor: true, color: theme.muted }, '  $ cp .env.example .env')
          );
          if (isNode) {
            doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  $ npm run infra:up'));
          } else {
            doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  $ docker compose up -d'));
          }
        }

        if (isPython) {
          if (ctx.ormDjango) {
            doneLines.push(
              e(Text, { dimColor: true, color: theme.muted }, '  $ python manage.py migrate'),
              e(Text, { dimColor: true, color: theme.muted }, '  $ python manage.py runserver')
            );
          } else {
            doneLines.push(
              e(Text, { dimColor: true, color: theme.muted }, '  $ uvicorn src.main:create_app --reload --factory --host 0.0.0.0 --port 8000')
            );
          }
        } else if (isGo) {
          doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  $ go run .'));
        } else {
          if (ctx.ormPrisma) {
            doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  $ npm run prisma:migrate'));
          }
          doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  $ npm run start:dev'));
        }

        if (ctx.useSwagger) {
          if (isPython && ctx.ormDjango) {
            doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  # API docs at http://localhost:8000/api/docs/'));
          } else if (isPython) {
            doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  # API docs at http://localhost:8000/docs'));
          } else {
            doneLines.push(e(Text, { dimColor: true, color: theme.muted }, '  # API docs at http://localhost:3000/api/docs'));
          }
        }
      }

      doneLines.push(
        e(Box, { marginTop: 1 },
          e(Text, { dimColor: true, color: theme.muted }, 'Press Enter to exit.')
        )
      );

      return e(Box, { flexDirection: 'column', paddingTop: 2 }, ...doneLines);
    }

    if (state.view === 'idle') {
      return e(Box, { flexDirection: 'column', paddingTop: 2 },
        e(Text, { color: theme.warning }, 'Loading wizard...')
      );
    }

    var qType = state.questionType;
    var msg = state.message;
    var choices = state.choices || [];
    var def = state.defaultValue;

    if (qType === 'list' || qType === 'select') {
      var defaultIdx = 0;
      if (def !== undefined) {
        var found = choices.findIndex(function (c) {
          return (c.value !== undefined ? c.value : c) === def;
        });
        if (found >= 0) defaultIdx = found;
      }

      var mappedChoices = choices.map(function (c) {
        return typeof c === 'object' ? c : { name: String(c), value: c };
      });

      var currentArch = highlightedArch;
      if (currentArch === null && mappedChoices.length > 0) {
        var initCh = mappedChoices[Math.max(0, defaultIdx)];
        currentArch = initCh ? initCh.value : null;
      }

      // Some question types (ORM, database, validation, broker choices)
      // have no entries in arch-descriptions.js at all -- showing the
      // panel there just means every single highlight displays the same
      // permanently-empty "Select an option to see details" placeholder,
      // which reads as broken/missing content rather than "nothing to
      // show here." Only show the panel for a question where at least
      // one choice actually has real content.
      var anyChoiceHasDescription = mappedChoices.some(function (c) {
        return !!archDescriptions[c.value];
      });
      var sidebarVisible = !!currentArch && !compact && anyChoiceHasDescription;
      var sidebar = e(SidePanel, {
        architecture: currentArch,
        visible: sidebarVisible,
        compact: compact,
      });

      var cols = 80;
      try { cols = process.stdout.columns || 80; } catch (_) {}
      var reserved = sidebarVisible ? getPanelWidth() + 2 : 0;
      var availableWidth = Math.max(20, cols - reserved);

      return e(Box, { flexDirection: compact ? 'column' : 'row' },
        e(Box, { flexDirection: 'column', flexGrow: 1 },
          e(SelectPrompt, {
            message: msg,
            choices: mappedChoices,
            selectedIndex: Math.max(0, defaultIdx),
            compact: compact,
            availableWidth: availableWidth,
            onSelect: function (chosen) {
              _answer(chosen.value !== undefined ? chosen.value : chosen);
            },
            onHighlight: function (idx, filtered) {
              var choice = filtered[idx];
              var val = choice ? choice.value : null;
              if (val !== highlightedArch) setHighlightedArch(val);
            },
            onKey: onKey,
          })
        ),
        sidebar
      );
    }

    if (qType === 'checkbox') {
      var mappedMulti = choices.map(function (c) {
        return { name: c.name || c.label || c.value, value: c.value };
      });
      var initialChecked = choices
        .filter(function (c) { return c.checked; })
        .map(function (c) { return c.value; });

      return e(Box, { flexDirection: 'row' },
        e(Box, { flexDirection: 'column', flexGrow: 1 },
          e(MultiSelectPrompt, {
            message: msg,
            choices: mappedMulti,
            initialChecked: initialChecked,
            onConfirm: function (values) { _answer(values); },
            onKey: onKey,
          })
        )
      );
    }

    if (qType === 'input') {
      return e(InputPrompt, {
        message: msg,
        defaultValue: def !== undefined ? String(def) : '',
        validate: state.validate,
        onSubmit: function (val) { _answer(val); },
        onKey: onKey,
      });
    }

    if (qType === 'confirm') {
      return e(ConfirmPrompt, {
        message: msg,
        defaultValue: def !== false,
        onConfirm: function (val) { _answer(val); },
        onKey: onKey,
      });
    }

    return e(Box, { flexDirection: 'column', paddingTop: 2 },
      e(Text, { color: theme.error }, 'Unknown question type: ' + qType)
    );
  }

  function getOverlayContext() {
    if (quitConfirmVisible) return 'confirm-quit';
    if (helpVisible) return determineContext() || 'welcome';
    return null;
  }

  var helpCtx = state.questionType === 'checkbox' ? 'multi-select'
    : state.questionType === 'list' || state.questionType === 'select' ? 'select'
    : state.questionType === 'input' ? 'input'
    : state.questionType === 'confirm' ? 'confirm'
    : state.view === 'summary' ? 'summary'
    : state.view === 'progress' ? 'progress'
    : state.view === 'prereqs' ? 'prereqs'
    : state.view === 'done' ? 'done'
    : 'select';

  var quitOverlayEl = null;
  if (quitConfirmVisible) {
    quitOverlayEl = e(Box, { flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, minHeight: 14 },
      e(Box, { borderStyle: 'single', borderColor: theme.error, paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 },
        e(Text, { bold: true, color: theme.error }, 'Quit without saving? (y/N)'),
        e(Box, { marginTop: 1 },
          e(Text, { color: theme.text }, 'y to quit, n or Esc to cancel')
        )
      )
    );
  }

  var hintCtx = determineContext();
  var hints = hintsForContext(hintCtx || 'select');
  var isWelcome = state.view === 'welcome' && !welcomeDismissed;

  return e(Box, { flexDirection: 'column', paddingLeft: 1, paddingRight: 1, minHeight: 24, key: 'r-' + renderKey },
    isWelcome || state.view === 'done' ? null : headerBar,
    isWelcome || state.view === 'done' ? null : e(StepRail, { steps: STEPS, currentIndex: state.stepIndex, width: Math.min(process.stdout.columns || 80, 100), compact: compact }),
    e(Box, { flexDirection: 'column', flexGrow: 1, minHeight: 14 },
      helpVisible
        ? e(HelpOverlay, { visible: true, context: helpCtx, hints: hintsForContext(helpCtx), onClose: function () { setHelpVisible(false); } })
        : quitConfirmVisible
          ? quitOverlayEl
          : e(React.Fragment, null, renderBody(), quitOverlayEl)
    ),
    isWelcome || state.view === 'done' ? null : e(KeyHints, { hints: hints, compact: compact, stepIndex: state.stepIndex })
  );
}

function WrappedApp() {
  return e(ErrorBoundary, null, e(App));
}

module.exports = {
  App: WrappedApp,
  pushQuestion: pushQuestion,
  _answer: _answer,
  _showCurrentQuestion: _showCurrentQuestion,
  _goBack: _goBack,
  showProgress: showProgress,
  updateProgress: updateProgress,
  showSummary: showSummary,
  showPrereqsScreen: showPrereqsScreen,
  showDone: showDone,
  getState: getState,
  setState: setState,
  cancelAll: cancelAll,
  setNavigator: setNavigator,
  setClearFn: setClearFn,
  _queue: _queue,
};
