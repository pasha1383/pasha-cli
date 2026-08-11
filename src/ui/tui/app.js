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
var e = React.createElement;

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

function pushQuestion(question, resolve) {
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

function showDone(message) {
  setState({
    view: 'done',
    doneMessage: message,
    doneTime: Date.now(),
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

  _onStateChange = function (newState) {
    setLocalState(Object.assign({}, newState));
  };

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

  React.useEffect(function () {
    if (_queue.length > 0 && state.view === 'welcome' && welcomeDismissed) {
      _showCurrentQuestion();
    }
    if (_queue.length > 0 && state.view === 'idle') {
      _showCurrentQuestion();
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
          exit();
          return;
        }
        if (state.view === 'done') {
          exit();
          return;
        }
        setQuitConfirmVisible(true);
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

  useInput(function (input, key) {
    if (state.view === 'welcome' && !welcomeDismissed) {
      setWelcomeDismissed(true);
      setLocalState(Object.assign({}, state, { view: 'idle' }));
      return;
    }

    if (quitConfirmVisible) {
      if (key.name === 'escape' || input === 'n') {
        setQuitConfirmVisible(false);
        return;
      }
      if (input === 'y') {
        exit();
        return;
      }
      return;
    }

    if (helpVisible) {
      if (key.name === 'escape') {
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
        setQuitConfirmVisible(true);
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
        setQuitConfirmVisible(true);
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

  if (state.view === 'welcome' && !welcomeDismissed) {
    return e(Box, { flexDirection: 'column', paddingLeft: 1, paddingRight: 1, minHeight: 24, paddingTop: 2 },
      e(Box, { flexDirection: 'column' },
        e(Text, { bold: true, color: 'magenta' }, 'pasha v2.1.0'),
      ),
      divider,
      e(Box, { flexDirection: 'column', paddingTop: 2, alignItems: 'center' },
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
      )
    );
  }

  function renderBody() {
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

      return e(Box, { flexDirection: 'column', paddingTop: 2 },
        e(Text, { bold: true, color: isSuccess ? 'green' : 'red', dimColor: dimmed },
          (isSuccess ? '\u2713 ' : '\u2717 ') + (state.doneMessage || 'Done!')
        ),
        e(Box, { marginTop: 1 }, e(Text, { dimColor: true }, 'Press Enter to exit.'))
      );
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
        visible: !!currentArch,
      });

      return e(Box, { flexDirection: 'row' },
        e(Box, { flexDirection: 'column', flexGrow: 1 },
          e(SelectPrompt, {
            message: msg,
            choices: mappedChoices,
            selectedIndex: Math.max(0, defaultIdx),
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

  var overlayCtx = getOverlayContext();
  var overlayEl = null;
  if (helpVisible) {
    var helpCtx = state.questionType === 'checkbox' ? 'multi-select'
      : state.questionType === 'list' || state.questionType === 'select' ? 'select'
      : state.questionType === 'input' ? 'input'
      : state.questionType === 'confirm' ? 'confirm'
      : state.view === 'summary' ? 'summary'
      : state.view === 'progress' ? 'progress'
      : state.view === 'done' ? 'done'
      : 'select';
    overlayEl = e(HelpOverlay, { context: helpCtx });
  } else if (quitConfirmVisible) {
    overlayEl = e(Box, { flexDirection: 'column', marginTop: 1, borderStyle: 'single', borderColor: 'red', paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 },
      e(Text, { bold: true, color: 'red' }, 'Quit pasha?'),
      e(Box, { marginTop: 1 },
        e(Text, { color: 'white' }, 'Press y to quit, n or Esc to cancel')
      )
    );
  }

  var hintCtx = determineContext();
  var hints = hintsForContext(hintCtx || 'select');

  return e(Box, { flexDirection: 'column', paddingLeft: 1, paddingRight: 1, minHeight: 24, key: 'r-' + renderKey },
    e(Box, { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 0, paddingBottom: 0 },
      e(Text, { bold: true, color: 'magenta' }, 'pasha v2.1.0'),
      e(Text, { dimColor: true }, headerBreadcrumb())
    ),
    divider,
    e(StepRail, { steps: STEPS, currentIndex: state.stepIndex, width: 78 }),
    divider,
    e(Box, { flexDirection: 'column', flexGrow: 1, minHeight: 14 },
      renderBody(),
      overlayEl
    ),
    divider,
    e(KeyHints, { hints: hints })
  );
}

module.exports = {
  App: App,
  pushQuestion: pushQuestion,
  showProgress: showProgress,
  updateProgress: updateProgress,
  showSummary: showSummary,
  showDone: showDone,
  getState: getState,
  setState: setState,
  _queue: _queue,
};
