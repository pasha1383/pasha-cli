'use strict';

const React = require('react');
const { getInk } = require('./ink-proxy');
const { StepRail } = require('./components/StepRail');
const { KeyHints } = require('./components/KeyHints');
const { SidePanel } = require('./components/SidePanel');
const { SelectPrompt } = require('./components/SelectPrompt');
const { MultiSelectPrompt } = require('./components/MultiSelectPrompt');
const { InputPrompt } = require('./components/InputPrompt');
const { ConfirmPrompt } = require('./components/ConfirmPrompt');
const { SummaryScreen } = require('./components/SummaryScreen');
const { ProgressScreen } = require('./components/ProgressScreen');
const { hintsForContext } = require('./keymap');
const e = React.createElement;

let _resolve = null;
let _queue = [];
let _onStateChange = null;
let _appState = null;
let _previousView = null;

function getState() {
  return _appState;
}

function setState(update) {
  _appState = Object.assign({}, _appState || {}, update);
  if (_onStateChange) _onStateChange(_appState);
}

function pushQuestion(question, resolve) {
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
  _queue.shift();
  if (_resolve) {
    var r = _resolve;
    _resolve = null;
    r(value);
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
    });
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

function showSummary(context, onEditCallback) {
  setState({
    view: 'summary',
    summaryContext: context,
    onEdit: onEditCallback || null,
  });
}

function showDone(message) {
  setState({
    view: 'done',
    doneMessage: message,
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

function App() {
  const { Text, Box, useInput, useApp } = getInk();
  var { exit } = useApp();
  var [state, setLocalState] = React.useState(function () {
    return _appState || {
      view: 'idle',
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

  _onStateChange = function (newState) {
    setLocalState(Object.assign({}, newState));
  };

  React.useEffect(function () {
    if (_queue.length > 0 && state.view === 'idle') {
      _showCurrentQuestion();
    }
  }, []);

  useInput(function (input, key) {
    if (key.escape && (state.view === 'summary' || state.view === 'progress')) {
      setLocalState(Object.assign({}, state, { view: 'question' }));
      return;
    }
    if (key.return && state.view === 'done') {
      exit();
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
    if (state.view === 'progress') {
      return e(ProgressScreen, {
        phases: state.phases || [],
        currentPhase: state.currentPhase,
        message: state.progressMessage,
      });
    }

    if (state.view === 'summary') {
      return e(SummaryScreen, {
        context: state.summaryContext,
        onEdit: state.onEdit,
      });
    }

    if (state.view === 'done') {
      return e(Box, { flexDirection: 'column', paddingTop: 2 },
        e(Text, { bold: true, color: 'green' }, state.doneMessage || 'Project created successfully!'),
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

      var sidebar = state.sidebarInfo
        ? e(SidePanel, { title: state.sidebarInfo.title, description: state.sidebarInfo.description, visible: true })
        : null;

      return e(Box, { flexDirection: 'row' },
        e(Box, { flexDirection: 'column', flexGrow: 1 },
          e(SelectPrompt, {
            message: msg,
            choices: mappedChoices,
            selectedIndex: Math.max(0, defaultIdx),
            onSelect: function (chosen) {
              _answer(chosen.value !== undefined ? chosen.value : chosen);
            },
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
      });
    }

    if (qType === 'confirm') {
      return e(ConfirmPrompt, {
        message: msg,
        defaultValue: def !== false,
        onConfirm: function (val) { _answer(val); },
      });
    }

    return e(Box, { flexDirection: 'column', paddingTop: 2 },
      e(Text, { color: 'red' }, 'Unknown question type: ' + qType)
    );
  }

  var ctx;
  if (state.view === 'summary') ctx = 'summary';
  else if (state.questionType === 'checkbox') ctx = 'multi-select';
  else if (state.questionType === 'list' || state.questionType === 'select') ctx = 'select';
  else ctx = 'wizard';

  return e(Box, { flexDirection: 'column', paddingLeft: 1, paddingRight: 1, minHeight: 24 },
    e(Box, { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 0, paddingBottom: 0 },
      e(Text, { bold: true, color: 'magenta' }, 'pasha v2.1.0'),
      e(Text, { dimColor: true }, headerBreadcrumb())
    ),
    divider,
    e(StepRail, { steps: STEPS, currentIndex: state.stepIndex, width: 78 }),
    divider,
    e(Box, { flexDirection: 'column', flexGrow: 1, minHeight: 14 }, renderBody()),
    divider,
    e(KeyHints, { hints: hintsForContext(ctx) })
  );
}

module.exports = {
  App: App,
  pushQuestion: pushQuestion,
  showProgress: showProgress,
  showSummary: showSummary,
  showDone: showDone,
  getState: getState,
  setState: setState,
  _queue: _queue,
};
