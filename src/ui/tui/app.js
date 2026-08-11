'use strict';

var React = require('react');
var { getInk } = require('./ink-proxy');
var { StepRail } = require('./components/StepRail');
var { KeyHints } = require('./components/KeyHints');
var { SidePanel } = require('./components/SidePanel');
var { SelectPrompt } = require('./components/SelectPrompt');
var { MultiSelectPrompt } = require('./components/MultiSelectPrompt');
var { InputPrompt } = require('./components/InputPrompt');
var { ConfirmPrompt } = require('./components/ConfirmPrompt');
var { SummaryScreen } = require('./components/SummaryScreen');
var { ProgressScreen } = require('./components/ProgressScreen');
var { HelpOverlay } = require('./components/HelpOverlay');
var { hintsForContext, mapKey } = require('./keymap');
var { onResize, restore: restoreTerminal } = require('./terminal');
var e = React.createElement;

var COMPACT_COLS = 60;
var COMPACT_ROWS = 15;

var _resolve = null;
var _queue = [];
var _onStateChange = null;
var _appState = null;
var _previousView = null;
var _answerHistory = [];

function getState() {
  return _appState;
}

function setState(update) {
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

  _resolve = null;
  _queue.shift();

  var prev = _answerHistory.length >= 2 ? _answerHistory[_answerHistory.length - 2] : null;
  if (prev) {
    _answerHistory.pop();
    _answerHistory.pop();
    _queue.unshift({ question: prev.question, resolve: prev.resolve });
    _showCurrentQuestion();
  } else {
    _answerHistory.pop();
    if (_queue.length > 0) {
      _showCurrentQuestion();
    } else {
      setState({
        view: 'idle',
        questionType: null,
        message: '',
        choices: [],
        answers: getState().answers || {},
        summaryContext: null,
      });
    }
  }
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

function showSummary(context, onEditCallback) {
  setState({
    view: 'summary',
    summaryContext: context,
    onEdit: onEditCallback || null,
  });
}

function _showSummaryFromCurrent() {
  var state = getState();
  if (state.view === 'summary') return;
  showSummary(state.answers || {});
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

var STEPS = [
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
        e(ink.Text, { bold: true, color: 'red' }, 'Fatal Error'),
        e(ink.Box, { marginTop: 1 },
          e(ink.Text, { color: 'red' }, String(props.error && props.error.message ? props.error.message : 'Unknown error'))
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
        _goBack();
        return;
      }
      if (action === 'quit') {
        if (quitConfirmVisible) {
          _confirmQuit();
          return;
        }
        if (state.view === 'done') {
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
      if (key.name === 'escape' || input === 'n' || input === 'N') {
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
      if (key.name === 'escape' || input === '?') {
        setHelpVisible(false);
        return;
      }
      return;
    }

    if (state.view === 'done') {
      if (key.name === 'return') {
        exit();
        return;
      }
      var ctrlC = key.ctrl && !key.meta && (input === 'c' || input === '\x03');
      if (ctrlC) {
        exit();
        return;
      }
      return;
    }

    if (state.view === 'progress') {
      var ctrlC2 = key.ctrl && !key.meta && (input === 'c' || input === '\x03');
      if (ctrlC2) {
        setQuitConfirmVisible(true);
        return;
      }
      return;
    }

    if (state.view === 'summary') {
      var ctrlC3 = key.ctrl && !key.meta && (input === 'c' || input === '\x03');
      if (ctrlC3) {
        if (hasAnswers(state.answers)) {
          setQuitConfirmVisible(true);
        } else {
          exit();
        }
        return;
      }
      if (key.name === 'escape') {
        setLocalState(Object.assign({}, state, { view: 'idle' }));
        _showCurrentQuestion();
        return;
      }
      if (key.name === 'return' || input === 's') {
        setLocalState(Object.assign({}, state, { view: 'idle' }));
        _showCurrentQuestion();
        return;
      }
      return;
    }

    if (state.view === 'idle') return;

    if (state.view === 'question') {
      var ctrlC4 = key.ctrl && !key.meta && (input === 'c' || input === '\x03');
      if (ctrlC4) {
        if (hasAnswers(state.answers)) {
          setQuitConfirmVisible(true);
        } else {
          exit();
        }
        return;
      }
      if (key.ctrl && !key.meta && (input === 'l' || input === '\x0c')) {
        setRenderKey(function (k) { return k + 1; });
        return;
      }
      return;
    }
  });

  function headerBreadcrumb() {
    var entries = Object.entries(state.answers || {});
    var parts = entries
      .filter(function (e) { return e[1] && typeof e[1] === 'string' && e[1].length > 0; })
      .slice(0, 3)
      .map(function (e) { return e[1]; });
    return parts.length > 0 ? parts.join(' \u00B7 ') : '';
  }

  var divider = e(Text, { color: 'gray' }, '\u2500'.repeat(78));

  function renderBody() {
    if (state.view === 'welcome' && !welcomeDismissed) {
      return e(Box, { flexDirection: 'column', paddingTop: 2, alignItems: 'center' },
        e(Box, { flexDirection: 'column' },
          ...LOGO_SHORT.map(function (line, i) {
            return e(Text, { key: i, color: 'magenta', dimColor: true }, line);
          })
        ),
        e(Box, { marginTop: 2 },
          e(Text, { dimColor: true }, 'Multi-language / multi-architecture CLI generator'),
        ),
        e(Box, { marginTop: 1 },
          e(Text, { color: 'white' }, 'Press any key to start...'),
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

    if (state.view === 'summary') {
      return e(SummaryScreen, {
        context: state.summaryContext || state.answers,
        onEdit: state.onEdit || null,
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

      doneLines.push(
        e(Box, {},
          e(Text, { bold: true, color: isSuccess ? 'green' : 'red', dimColor: dimmed },
            (isSuccess ? '\u2713 ' : '\u2717 ') + (state.doneMessage || 'Done!')
          )
        )
      );

      if (outPath && isSuccess) {
        doneLines.push(
          e(Box, { marginTop: 1 },
            e(Text, { bold: true, color: 'white' }, outPath)
          )
        );
      }

      if (isSuccess && outPath && ctx.projectName) {
        var isNode = ctx.language === 'node';
        var isPython = ctx.language === 'python';
        var isGo = ctx.language === 'go';

        doneLines.push(
          e(Box, { marginTop: 1, flexDirection: 'column' },
            e(Text, { bold: true }, 'Next steps:'),
            e(Text, { dimColor: true }, '  cd ' + ctx.projectName)
          )
        );

        if (isPython) {
          doneLines.push(
            e(Text, { dimColor: true }, '  python3 -m venv venv'),
            e(Text, { dimColor: true }, '  source venv/bin/activate'),
            e(Text, { dimColor: true }, '  pip install -r requirements.txt')
          );
          if (ctx.devRequirementsTxt) {
            doneLines.push(e(Text, { dimColor: true }, '  pip install -r dev-requirements.txt'));
          }
        }

        if (isGo) {
          doneLines.push(e(Text, { dimColor: true }, '  go mod tidy'));
        }

        if (isNode) {
          doneLines.push(e(Text, { dimColor: true }, '  npm install'));
        }

        if (ctx.useDocker) {
          doneLines.push(
            e(Text, { dimColor: true }, '  cp .env.example .env')
          );
          if (isNode) {
            doneLines.push(e(Text, { dimColor: true }, '  npm run infra:up'));
          } else {
            doneLines.push(e(Text, { dimColor: true }, '  docker compose up -d'));
          }
        }

        if (isPython) {
          if (ctx.ormDjango) {
            doneLines.push(
              e(Text, { dimColor: true }, '  python manage.py migrate'),
              e(Text, { dimColor: true }, '  python manage.py runserver')
            );
          } else {
            doneLines.push(
              e(Text, { dimColor: true }, '  uvicorn src.main:create_app --reload --factory --host 0.0.0.0 --port 8000')
            );
          }
        } else if (isGo) {
          doneLines.push(e(Text, { dimColor: true }, '  go run .'));
        } else {
          if (ctx.ormPrisma) {
            doneLines.push(e(Text, { dimColor: true }, '  npm run prisma:migrate'));
          }
          doneLines.push(e(Text, { dimColor: true }, '  npm run start:dev'));
        }

        if (ctx.useSwagger) {
          if (isPython && ctx.ormDjango) {
            doneLines.push(e(Text, { dimColor: true }, '  # API docs at http://localhost:8000/api/docs/'));
          } else if (isPython) {
            doneLines.push(e(Text, { dimColor: true }, '  # API docs at http://localhost:8000/docs'));
          } else {
            doneLines.push(e(Text, { dimColor: true }, '  # API docs at http://localhost:3000/api/docs'));
          }
        }
      }

      doneLines.push(
        e(Box, { marginTop: 1 },
          e(Text, { dimColor: dimmed }, 'Press Enter to exit.')
        )
      );

      return e(Box, { flexDirection: 'column', paddingTop: 2 }, ...doneLines);
    }

    if (state.view === 'idle') {
      return e(Box, { flexDirection: 'column', paddingTop: 2 },
        e(Text, { color: 'yellow' }, 'Loading wizard...')
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

      var sidebar = e(SidePanel, {
        architecture: currentArch,
        visible: !!currentArch && !compact,
        compact: compact,
      });

      return e(Box, { flexDirection: compact ? 'column' : 'row' },
        e(Box, { flexDirection: 'column', flexGrow: 1 },
          e(SelectPrompt, {
            message: msg,
            choices: mappedChoices,
            selectedIndex: Math.max(0, defaultIdx),
            compact: compact,
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
      e(Text, { color: 'red' }, 'Unknown question type: ' + qType)
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
    : state.view === 'done' ? 'done'
    : 'select';

  var quitOverlayEl = null;
  if (quitConfirmVisible) {
    quitOverlayEl = e(Box, { flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, minHeight: 14 },
      e(Box, { borderStyle: 'single', borderColor: 'red', paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 },
        e(Text, { bold: true, color: 'red' }, 'Quit without saving? (y/N)'),
        e(Box, { marginTop: 1 },
          e(Text, { color: 'white' }, 'y to quit, n or Esc to cancel')
        )
      )
    );
  }

  var hintCtx = determineContext();
  var hints = hintsForContext(hintCtx || 'select');
  var isWelcome = state.view === 'welcome' && !welcomeDismissed;

  return e(Box, { flexDirection: 'column', paddingLeft: 1, paddingRight: 1, minHeight: 24, key: 'r-' + renderKey },
    e(Box, { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 0, paddingBottom: 0 },
      e(Text, { bold: true, color: 'magenta' }, 'pasha v2.1.0'),
      e(Text, { dimColor: true }, headerBreadcrumb())
    ),
    divider,
    isWelcome ? null : e(StepRail, { steps: STEPS, currentIndex: state.stepIndex, width: compact ? process.stdout.columns : 78, compact: compact }),
    isWelcome ? null : divider,
    e(Box, { flexDirection: 'column', flexGrow: 1, minHeight: 14 },
      helpVisible
        ? e(HelpOverlay, { visible: true, context: helpCtx, hints: hintsForContext(helpCtx), onClose: function () { setHelpVisible(false); } })
        : quitConfirmVisible
          ? quitOverlayEl
          : e(React.Fragment, null, renderBody(), quitOverlayEl)
    ),
    isWelcome ? null : divider,
    isWelcome ? null : e(KeyHints, { hints: hints, compact: compact })
  );
}

function WrappedApp() {
  return e(ErrorBoundary, null, e(App));
}

module.exports = {
  App: WrappedApp,
  pushQuestion: pushQuestion,
  showProgress: showProgress,
  updateProgress: updateProgress,
  showSummary: showSummary,
  showDone: showDone,
  getState: getState,
  setState: setState,
  cancelAll: cancelAll,
  _queue: _queue,
};
