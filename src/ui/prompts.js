'use strict';

let _inquirer = null;
let _tuiMode = false;
let _tuiApp = null;
let _tuiContext = {};

async function _load() {
  if (!_inquirer) {
    _inquirer = await import('@inquirer/prompts');
  }
  return _inquirer;
}

function setTuiMode(enabled) {
  _tuiMode = !!enabled;
  if (!enabled) _tuiApp = null;
}

function setTuiApp(app) {
  _tuiApp = app;
}

function setTuiContext(ctx) {
  _tuiContext = Object.assign({}, ctx);
}

function isTuiMode() {
  return _tuiMode && _tuiApp !== null;
}

async function prompt(questions) {
  if (isTuiMode()) {
    return _promptTui(questions);
  }
  return _promptInquirer(questions);
}

async function _promptInquirer(questions) {
  const { input, select, confirm: confirmPrompt, checkbox, password, Separator } = await _load();
  const answers = {};
  for (const q of questions) {
    switch (q.type) {
      case 'input':
        answers[q.name] = await input({
          message: q.message,
          default: q.default,
          validate: q.validate ? (v) => {
            const result = q.validate(v);
            return result === true ? true : result || 'Invalid input';
          } : undefined,
          theme: q.theme,
        });
        break;
      case 'list':
      case 'select': {
        const rawChoices = q.choices || [];
        const choices = rawChoices.map(c => {
          if (c === null || c === undefined) return new Separator();
          if (typeof c === 'object' && (c.value === undefined || c.value === null)) return new Separator();
          if (typeof c === 'object') return { name: c.name, value: c.value, description: c.description };
          return { name: String(c), value: c };
        });
        answers[q.name] = await select({
          message: q.message,
          choices,
          default: q.default,
          theme: q.theme,
          loop: false,
        });
        break;
      }
      case 'confirm':
        answers[q.name] = await confirmPrompt({
          message: q.message,
          default: q.default !== false,
          theme: q.theme,
        });
        break;
      case 'checkbox':
        answers[q.name] = await checkbox({
          message: q.message,
          choices: (q.choices || []).map(c => ({
            name: c.name,
            value: c.value,
            checked: c.checked || false,
            description: c.description,
          })),
          theme: q.theme,
        });
        break;
      case 'password':
        answers[q.name] = await password({
          message: q.message,
          mask: '*',
          theme: q.theme,
        });
        break;
      default:
        throw new Error(`Unknown prompt type: ${q.type}`);
    }
  }
  return answers;
}

async function _promptTui(questions) {
  const { pushQuestion } = _tuiApp;
  const answers = {};
  for (const q of questions) {
    const augmented = Object.assign({}, q, {
      stepIndex: _tuiContext.stepIndex || 0,
      totalSteps: _tuiContext.totalSteps || 1,
      stepLabel: _tuiContext.stepLabel || '',
      answers: _tuiContext.answers || {},
      sidebarInfo: q.sidebarInfo || _tuiContext.sidebarInfo || null,
    });
    const answer = await new Promise((resolve) => {
      pushQuestion(augmented, (value) => {
        resolve(value);
      });
    });
    answers[q.name] = answer;
  }
  return answers;
}

module.exports = { prompt, setTuiMode, setTuiApp, isTuiMode, setTuiContext };
