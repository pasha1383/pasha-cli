'use strict';

const readline = require('readline');

let _tuiMode = false;
let _tuiApp = null;
let _tuiContext = {};

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
  return _promptFallback(questions);
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
      try {
        pushQuestion(augmented, (value) => {
          resolve(value);
        });
      } catch (err) {
        resolve(null);
      }
    });
    answers[q.name] = answer;
  }
  return answers;
}

async function _promptFallback(questions) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answers = {};
  for (const q of questions) {
    switch (q.type) {
      case 'confirm': {
        const def = q.default !== false ? 'Y/n' : 'y/N';
        answers[q.name] = await _ask(rl, `${q.message} (${def}) `);
        const val = answers[q.name].toLowerCase();
        if (q.default !== false) {
          answers[q.name] = val !== 'n' && val !== 'no';
        } else {
          answers[q.name] = val === 'y' || val === 'yes';
        }
        break;
      }
      case 'input':
        answers[q.name] = await _ask(rl, `${q.message} ` + (q.default ? `(${q.default}) ` : ''));
        if (!answers[q.name] && q.default) answers[q.name] = q.default;
        if (q.validate) {
          const result = q.validate(answers[q.name]);
          if (result !== true) {
            console.log('  ' + (result || 'Invalid input'));
            answers[q.name] = q.default || '';
          }
        }
        break;
      case 'list':
      case 'select': {
        const choices = q.choices || [];
        console.log(q.message);
        choices.forEach((c, i) => {
          const name = typeof c === 'object' ? c.name : String(c);
          console.log(`  ${i + 1}. ${name}`);
        });
        if (q.default) {
          const defIdx = choices.findIndex(c =>
            (typeof c === 'object' ? c.value : c) === q.default
          );
          if (defIdx >= 0) console.log(`  Default: ${defIdx + 1}`);
        }
        const input = await _ask(rl, 'Choose (number): ');
        const idx = parseInt(input, 10) - 1;
        if (idx >= 0 && idx < choices.length) {
          const choice = choices[idx];
          answers[q.name] = typeof choice === 'object' ? choice.value : choice;
        } else if (q.default !== undefined) {
          answers[q.name] = q.default;
        } else {
          answers[q.name] = (choices[0] && typeof choices[0] === 'object') ? choices[0].value : choices[0];
        }
        break;
      }
      case 'checkbox': {
        const chs = q.choices || [];
        console.log(q.message);
        chs.forEach((c, i) => {
          const checked = c.checked ? '[x]' : '[ ]';
          console.log(`  ${checked} ${i + 1}. ${c.name}`);
        });
        const input = await _ask(rl, 'Enter numbers separated by commas (e.g. 1,2,4): ');
        answers[q.name] = input.split(',')
          .map(s => parseInt(s.trim(), 10) - 1)
          .filter(i => i >= 0 && i < chs.length)
          .map(i => chs[i].value);
        break;
      }
      default:
        answers[q.name] = q.default || '';
    }
  }
  rl.close();
  return answers;
}

function _ask(rl, text) {
  return new Promise(resolve => {
    rl.question(text, resolve);
  });
}

module.exports = { prompt, setTuiMode, setTuiApp, isTuiMode, setTuiContext };
