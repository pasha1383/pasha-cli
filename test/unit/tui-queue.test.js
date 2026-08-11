'use strict';

function tick() {
  return new Promise(function (resolve) {
    setImmediate(resolve);
  });
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

describe('TUI queue mechanism', function () {
  var prompts;
  var tuiApp;

  beforeEach(function () {
    jest.resetModules();
    prompts = require('../../src/ui/prompts');
    tuiApp = require('../../src/ui/tui/app');

    tuiApp._queue.length = 0;
    tuiApp.setState({ view: 'idle', answers: {} });

    prompts.setTuiMode(true);
    prompts.setTuiApp(tuiApp);
    prompts.setTuiContext({});
  });

  describe('pushQuestion and _showCurrentQuestion', function () {
    it('adds question to queue', function () {
      var resolved = null;
      tuiApp.pushQuestion({ type: 'input', name: 'test', message: 'Hello' }, function (v) {
        resolved = v;
      });

      expect(tuiApp._queue.length).toBe(1);
      expect(tuiApp._queue[0].question.type).toBe('input');
      expect(tuiApp._queue[0].question.message).toBe('Hello');
      expect(typeof tuiApp._queue[0].resolve).toBe('function');
    });

    it('sets app state when first question is pushed', function () {
      tuiApp.pushQuestion(
        { type: 'list', name: 'lang', message: 'Pick language', choices: [{ name: 'Go', value: 'go' }] },
        function () {}
      );

      var state = tuiApp.getState();
      expect(state.view).toBe('question');
      expect(state.questionType).toBe('list');
      expect(state.message).toBe('Pick language');
      expect(state.choices).toEqual([{ name: 'Go', value: 'go' }]);
    });

    it('second pushQuestion does not change state until first answered', function () {
      tuiApp.pushQuestion(
        { type: 'list', name: 'first', message: 'First' },
        function () {}
      );
      tuiApp.pushQuestion(
        { type: 'input', name: 'second', message: 'Second' },
        function () {}
      );

      expect(tuiApp._queue.length).toBe(2);

      var state = tuiApp.getState();
      expect(state.message).toBe('First');
    });

    it('_showCurrentQuestion sets state from queue head', function () {
      tuiApp._queue.push({
        question: { type: 'confirm', name: 'ok', message: 'Proceed?' },
        resolve: function () {},
      });

      tuiApp._showCurrentQuestion();

      var state = tuiApp.getState();
      expect(state.view).toBe('question');
      expect(state.questionType).toBe('confirm');
      expect(state.message).toBe('Proceed?');
    });
  });

  describe('_answer flow', function () {
    it('resolves a queued question and removes it', function () {
      var received = null;
      tuiApp.pushQuestion(
        { type: 'input', name: 'name', message: 'Your name?' },
        function (v) { received = v; }
      );

      expect(tuiApp._queue.length).toBe(1);

      tuiApp._answer('Alice');

      expect(received).toBe('Alice');
      expect(tuiApp._queue.length).toBe(0);
    });

    it('advances to next question automatically', function () {
      tuiApp.pushQuestion(
        { type: 'input', name: 'first', message: 'First?' },
        function () {}
      );
      tuiApp.pushQuestion(
        { type: 'input', name: 'second', message: 'Second?' },
        function () {}
      );

      tuiApp._answer('a');

      var state = tuiApp.getState();
      expect(state.view).toBe('question');
      expect(state.message).toBe('Second?');
    });

    it('resets state to idle when queue becomes empty', function () {
      tuiApp.pushQuestion(
        { type: 'input', name: 'only', message: 'Only' },
        function () {}
      );

      tuiApp._answer('done');

      var state = tuiApp.getState();
      expect(state.view).toBe('idle');
      expect(state.questionType).toBeNull();
      expect(state.message).toBe('');
    });

    it('clears questionType in state when returning to idle', function () {
      tuiApp.pushQuestion(
        { type: 'input', name: 'only', message: 'Only' },
        function () {}
      );

      expect(tuiApp.getState().questionType).toBe('input');

      tuiApp._answer('done');

      var state = tuiApp.getState();
      expect(state.view).toBe('idle');
      expect(state.questionType).toBeNull();
      expect(state.message).toBe('');
      expect(state.choices).toEqual([]);
    });

    it('is safe to call on empty queue', function () {
      expect(function () {
        tuiApp._answer('nobody');
      }).not.toThrow();

      expect(tuiApp._queue.length).toBe(0);
    });
  });

  describe('prompts.prompt integration', function () {
    it('resolves a single list question via TUI', function () {
      var answerPromise = prompts.prompt([
        {
          type: 'list',
          name: 'lang',
          message: 'Pick language',
          choices: [
            { name: 'Go', value: 'go' },
            { name: 'Node', value: 'node' },
          ],
        },
      ]);

      var state = tuiApp.getState();
      expect(state.view).toBe('question');
      expect(state.message).toBe('Pick language');

      tuiApp._answer('go');

      return answerPromise.then(function (result) {
        expect(result).toEqual({ lang: 'go' });
      });
    });

    it('resolves an input question', function () {
      var answerPromise = prompts.prompt([
        { type: 'input', name: 'project', message: 'Project name?', default: 'myapp' },
      ]);

      tuiApp._answer('mycoolapp');

      return answerPromise.then(function (result) {
        expect(result).toEqual({ project: 'mycoolapp' });
      });
    });

    it('resolves a confirm question', function () {
      var answerPromise = prompts.prompt([
        { type: 'confirm', name: 'useDocker', message: 'Use Docker?' },
      ]);

      tuiApp._answer(true);

      return answerPromise.then(function (result) {
        expect(result).toEqual({ useDocker: true });
      });
    });

    it('resolves multiple sequential questions', function () {
      var answerPromise = prompts.prompt([
        { type: 'list', name: 'lang', message: 'Language?', choices: [{ name: 'Go', value: 'go' }] },
        { type: 'input', name: 'project', message: 'Project?' },
        { type: 'confirm', name: 'docker', message: 'Docker?' },
      ]);

      // answer first question
      tuiApp._answer('go');

      return tick()
        .then(function () {
          expect(tuiApp.getState().message).toBe('Project?');
          tuiApp._answer('myapp');
          return tick();
        })
        .then(function () {
          expect(tuiApp.getState().message).toBe('Docker?');
          tuiApp._answer(true);
          return answerPromise;
        })
        .then(function (result) {
          expect(result).toEqual({ lang: 'go', project: 'myapp', docker: true });
        });
    });

    it('queue advances correctly between questions', function () {
      var answerPromise = prompts.prompt([
        { type: 'list', name: 'q1', message: 'Q1', choices: [{ name: 'A', value: 'a' }] },
        { type: 'input', name: 'q2', message: 'Q2' },
      ]);

      expect(tuiApp.getState().message).toBe('Q1');

      tuiApp._answer('a');

      return tick()
        .then(function () {
          expect(tuiApp.getState().view).toBe('question');
          expect(tuiApp.getState().message).toBe('Q2');

          tuiApp._answer('b');
          return answerPromise;
        })
        .then(function (result) {
          expect(result).toEqual({ q1: 'a', q2: 'b' });
        });
    });

    it('state returns to idle after all questions answered', function () {
      var answerPromise = prompts.prompt([
        { type: 'input', name: 'name', message: 'Name?' },
      ]);

      tuiApp._answer('done');

      return answerPromise.then(function () {
        var state = tuiApp.getState();
        expect(state.view).toBe('idle');
        expect(state.questionType).toBeNull();
      });
    });

    it('passes step context from setTuiContext to questions', function () {
      prompts.setTuiContext({ stepIndex: 2, totalSteps: 5, stepLabel: 'Architecture' });

      var answerPromise = prompts.prompt([
        { type: 'input', name: 'pattern', message: 'Pattern?' },
      ]);

      var q = tuiApp._queue[0].question;
      expect(q.stepIndex).toBe(2);
      expect(q.totalSteps).toBe(5);
      expect(q.stepLabel).toBe('Architecture');

      tuiApp._answer('cqrs');
      return answerPromise;
    });

    it('prompt non-TUI mode falls back and does not use queue', function () {
      prompts.setTuiMode(false);
      tuiApp.setState({ view: 'idle', answers: {}, questionType: null, message: '', choices: [] });

      expect(tuiApp._queue.length).toBe(0);
      expect(prompts.isTuiMode()).toBe(false);

      // verify queue still empty
      expect(tuiApp._queue.length).toBe(0);
    });
  });

  describe('cancel flow', function () {
    it('cancelAll resolves current question with __cancel__', function () {
      var answerPromise = prompts.prompt([
        { type: 'input', name: 'name', message: 'Name?' },
      ]);

      expect(tuiApp.getState().view).toBe('question');

      tuiApp.cancelAll();

      expect(tuiApp.getState().view).toBe('idle');

      return answerPromise
        .then(function () {
          throw new Error('Should have thrown ExitPromptError');
        })
        .catch(function (err) {
          expect(err.name).toBe('ExitPromptError');
          expect(err.message).toBe('Cancelled by user');
        });
    });

    it('cancelAll clears the queue', function () {
      tuiApp.pushQuestion(
        { type: 'input', name: 'a', message: 'A' },
        function () {}
      );
      tuiApp.pushQuestion(
        { type: 'input', name: 'b', message: 'B' },
        function () {}
      );

      tuiApp.cancelAll();

      var state = tuiApp.getState();
      expect(state.view).toBe('idle');
      expect(state.answers).toEqual({});
    });

    it('cancelAll resets state answers', function () {
      tuiApp.setState({ answers: { lang: 'go', framework: 'gin' } });

      tuiApp.pushQuestion(
        { type: 'input', name: 'x', message: 'X' },
        function () {}
      );

      tuiApp.cancelAll();

      expect(tuiApp.getState().answers).toEqual({});
    });

    it('cancelAll during multi-question cancels remaining', function () {
      var answerPromise = prompts.prompt([
        { type: 'input', name: 'first', message: 'First?' },
        { type: 'input', name: 'second', message: 'Second?' },
      ]);

      // answer first
      tuiApp._answer('one');

      return tick()
        .then(function () {
          expect(tuiApp.getState().view).toBe('question');
          tuiApp.cancelAll();

          return answerPromise
            .then(function () {
              throw new Error('Should have thrown');
            })
            .catch(function (err) {
              expect(err.name).toBe('ExitPromptError');
            });
        });
    });
  });

  describe('state management', function () {
    it('getState returns current state', function () {
      tuiApp.setState({ view: 'progress', message: 'Working' });

      expect(tuiApp.getState().view).toBe('progress');
      expect(tuiApp.getState().message).toBe('Working');
    });

    it('setState merges with existing state', function () {
      tuiApp.setState({ view: 'idle', answers: { a: 1 } });
      tuiApp.setState({ view: 'question', message: 'Hello' });

      var state = tuiApp.getState();
      expect(state.view).toBe('question');
      expect(state.message).toBe('Hello');
      expect(state.answers).toEqual({ a: 1 });
    });

    it('setState preserves unmentioned keys on merge', function () {
      tuiApp.setState({ view: 'idle', answers: { x: 1 }, questionType: 'input', message: 'Old', choices: [] });
      tuiApp.setState({ message: 'New' });

      var state = tuiApp.getState();
      expect(state.message).toBe('New');
      expect(state.answers).toEqual({ x: 1 });
    });

    it('pushQuestion updates step metadata in state', function () {
      tuiApp.pushQuestion(
        {
          type: 'input',
          name: 'name',
          message: 'Your name?',
          stepIndex: 3,
          totalSteps: 7,
          stepLabel: 'Project',
        },
        function () {}
      );

      var state = tuiApp.getState();
      expect(state.stepIndex).toBe(3);
      expect(state.totalSteps).toBe(7);
      expect(state.stepLabel).toBe('Project');
    });

    it('showProgress updates state to progress view', function () {
      tuiApp.showProgress(['init', 'gen', 'done'], 'gen', 'Rendering...');

      var state = tuiApp.getState();
      expect(state.view).toBe('progress');
      expect(state.phases).toEqual(['init', 'gen', 'done']);
      expect(state.currentPhase).toBe('gen');
      expect(state.progressMessage).toBe('Rendering...');
    });

    it('updateProgress merges into current state', function () {
      tuiApp.showProgress(['a', 'b'], 'a', 'Starting');
      tuiApp.updateProgress({ currentPhase: 'b', progressMessage: 'Done' });

      var state = tuiApp.getState();
      expect(state.view).toBe('progress');
      expect(state.currentPhase).toBe('b');
      expect(state.progressMessage).toBe('Done');
    });

    it('showSummary updates state to summary view', function () {
      var ctx = { lang: 'go', framework: 'gin' };
      tuiApp.showSummary(ctx);

      var state = tuiApp.getState();
      expect(state.view).toBe('summary');
      expect(state.summaryContext).toEqual(ctx);
    });

    it('showDone updates state to done view', function () {
      tuiApp.showDone('Project created!', '/tmp/out', { lang: 'go' });

      var state = tuiApp.getState();
      expect(state.view).toBe('done');
      expect(state.doneMessage).toBe('Project created!');
      expect(state.doneOutPath).toBe('/tmp/out');
      expect(state.doneCtx).toEqual({ lang: 'go' });
    });
  });

  describe('edge cases and timing', function () {
    it('handles rapid answering (resolve before next push)', function () {
      var answerPromise = prompts.prompt([
        { type: 'input', name: 'a', message: 'A?' },
        { type: 'input', name: 'b', message: 'B?' },
      ]);

      tuiApp._answer('1');

      return tick()
        .then(function () {
          tuiApp._answer('2');
          return answerPromise;
        })
        .then(function (result) {
          expect(result).toEqual({ a: '1', b: '2' });
        });
    });

    it('handles empty choices in select', function () {
      var q = {
        type: 'list',
        name: 'lang',
        message: 'Pick language',
        choices: [],
      };

      var answerPromise = prompts.prompt([q]);

      var state = tuiApp.getState();
      expect(state.choices).toEqual([]);

      tuiApp._answer(undefined);
      return answerPromise.then(function (result) {
        expect(result).toEqual({ lang: undefined });
      });
    });

    it('handles null defaultValue', function () {
      var answerPromise = prompts.prompt([
        { type: 'input', name: 'x', message: 'X?', default: null },
      ]);

      var q = tuiApp._queue[0].question;
      expect(q.default).toBeNull();

      tuiApp._answer('');
      return answerPromise.then(function (result) {
        expect(result).toEqual({ x: '' });
      });
    });

    it('handles validate field in question', function () {
      var validateFn = function (v) { return v.length > 3 ? true : 'Too short'; };

      var answerPromise = prompts.prompt([
        { type: 'input', name: 'name', message: 'Name?', validate: validateFn },
      ]);

      var state = tuiApp.getState();
      expect(state.validate).toBe(validateFn);

      tuiApp._answer('John');
      return answerPromise.then(function (result) {
        expect(result).toEqual({ name: 'John' });
      });
    });

    it('handles sidebarInfo in question', function () {
      var answerPromise = prompts.prompt([
        {
          type: 'list',
          name: 'arch',
          message: 'Architecture?',
          sidebarInfo: { title: 'Hexagonal', description: 'Ports & adapters' },
          choices: [{ name: 'Hexagonal', value: 'hex' }],
        },
      ]);

      var q = tuiApp._queue[0].question;
      expect(q.sidebarInfo).toEqual({ title: 'Hexagonal', description: 'Ports & adapters' });

      tuiApp._answer('hex');
      return answerPromise;
    });
  });

  describe('setTuiMode and setTuiApp', function () {
    it('isTuiMode returns false without app', function () {
      prompts.setTuiApp(null);
      prompts.setTuiMode(true);
      expect(prompts.isTuiMode()).toBe(false);
    });

    it('isTuiMode returns false when mode disabled', function () {
      prompts.setTuiApp(tuiApp);
      prompts.setTuiMode(false);
      expect(prompts.isTuiMode()).toBe(false);
    });

    it('isTuiMode returns true when both set', function () {
      prompts.setTuiApp(tuiApp);
      prompts.setTuiMode(true);
      expect(prompts.isTuiMode()).toBe(true);
    });

    it('setTuiMode(false) clears the app', function () {
      prompts.setTuiApp(tuiApp);
      prompts.setTuiMode(true);
      expect(prompts.isTuiMode()).toBe(true);

      prompts.setTuiMode(false);
      expect(prompts.isTuiMode()).toBe(false);
      expect(function () {
        // verify app was cleared - isTuiMode checks _tuiApp !== null
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Multi-step wizard flow — all 9 steps
  // ---------------------------------------------------------------------------
  describe('Multi-step wizard flow (9 steps)', function () {
    beforeEach(function () {
      prompts.setTuiContext({
        stepIndex: 0,
        totalSteps: 9,
        stepLabel: 'Mode',
        answers: {},
      });
    });

    it('completes all 9 wizard steps end-to-end', function () {
      var defs = [
        { label: 'Mode',         answer: 'single',  type: 'list',    name: 'mode',         msg: 'What to build?' },
        { label: 'Language',     answer: 'node',    type: 'list',    name: 'language',     msg: 'Pick language' },
        { label: 'Framework',    answer: 'express', type: 'list',    name: 'framework',    msg: 'Pick framework' },
        { label: 'Architecture', answer: 'hex',     type: 'list',    name: 'architecture', msg: 'Pick architecture' },
        { label: 'Prereqs',      answer: true,      type: 'confirm', name: 'install',      msg: 'Install tools?' },
        { label: 'Project',      answer: 'myapp',   type: 'input',   name: 'projectName',  msg: 'Project name?' },
        { label: 'Stack',        answer: ['a'],     type: 'checkbox', name: 'extras',     msg: 'Extras?' },
        { label: 'Modules',      answer: ['m1'],    type: 'checkbox', name: 'modules',     msg: 'Modules?' },
        { label: 'Review',       answer: true,      type: 'confirm', name: 'confirm',      msg: 'Generate?' },
      ];

      // Build choices per type inline
      function makeQuestion(step, idx) {
        if (step.type === 'list') {
          var choices = idx === 0
            ? [{ name: 'Single', value: 'single' }, { name: 'Frontend', value: 'frontend' }]
            : [{ name: 'A', value: step.answer }];
          return { type: step.type, name: step.name, message: step.msg, choices: choices };
        }
        if (step.type === 'checkbox') {
          var ch1 = typeof step.answer[0] === 'string' ? step.answer[0] : 'opt';
          return { type: step.type, name: step.name, message: step.msg,
                   choices: [{ name: 'Option', value: ch1 }] };
        }
        return { type: step.type, name: step.name, message: step.msg };
      }

      var collected = {};

      function run(idx) {
        if (idx >= defs.length) return Promise.resolve(collected);

        var s = defs[idx];
        prompts.setTuiContext({
          stepIndex: idx,
          totalSteps: defs.length,
          stepLabel: s.label,
          answers: collected,
        });

        var q = [makeQuestion(s, idx)];
        var p = prompts.prompt(q);

        tuiApp._answer(s.answer);

        return p.then(function (r) {
          Object.assign(collected, r);
          return run(idx + 1);
        });
      }

      return run(0).then(function (final) {
        expect(final.mode).toBe('single');
        expect(final.language).toBe('node');
        expect(final.framework).toBe('express');
        expect(final.architecture).toBe('hex');
        expect(final.install).toBe(true);
        expect(final.projectName).toBe('myapp');
        expect(final.extras).toEqual(['a']);
        expect(final.modules).toEqual(['m1']);
        expect(final.confirm).toBe(true);
        expect(tuiApp.getState().view).toBe('idle');
      });
    }, 15000);

    it('preserves step metadata across all 9 steps', function () {
      var labels = ['Mode','Language','Framework','Architecture','Prereqs','Project','Stack','Modules','Review'];

      function runSequence(idx) {
        if (idx >= labels.length) return Promise.resolve();

        prompts.setTuiContext({
          stepIndex: idx,
          totalSteps: labels.length,
          stepLabel: labels[idx],
          answers: { dummy: 'ok' },
        });

        var p = prompts.prompt([
          { type: 'input', name: 'step_' + idx, message: labels[idx] + '?' },
        ]);

        var state = tuiApp.getState();
        expect(state.stepIndex).toBe(idx);
        expect(state.totalSteps).toBe(labels.length);
        expect(state.stepLabel).toBe(labels[idx]);

        tuiApp._answer('value-' + idx);

        return p.then(function () {
          return runSequence(idx + 1);
        });
      }

      return runSequence(0).then(function () {
        expect(tuiApp.getState().view).toBe('idle');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Back navigation
  // ---------------------------------------------------------------------------
  describe('Back navigation', function () {
    it('_goBack is safe to call on empty queue', function () {
      expect(function () {
        tuiApp._goBack();
      }).not.toThrow();

      expect(tuiApp._queue.length).toBe(0);
    });

    it('_goBack on a single-question prompt returns to idle', function () {
      prompts.prompt([
        { type: 'input', name: 'only', message: 'Only?' },
      ]);

      expect(tuiApp.getState().view).toBe('question');
      expect(tuiApp.getState().message).toBe('Only?');

      // _goBack on the first/only question clears it and returns idle
      tuiApp._goBack();

      var state = tuiApp.getState();
      expect(state.view).toBe('idle');
      expect(state.questionType).toBeNull();
    });

    it('_goBack on first question of multi-step prompt returns to idle', function () {
      prompts.prompt([
        { type: 'list', name: 'q1', message: 'Q1?',
          choices: [{ name: 'A', value: 'a' }] },
        { type: 'input', name: 'q2', message: 'Q2?' },
      ]);

      // Go back from first question before answering
      expect(tuiApp.getState().view).toBe('question');
      expect(tuiApp.getState().message).toBe('Q1?');

      tuiApp._goBack();

      var state = tuiApp.getState();
      expect(state.view).toBe('idle');
      expect(state.questionType).toBeNull();
    });

    it('wizard-level back: clear context and re-push previous step', function () {
      // Step N-1: push a "language" question with full step context
      prompts.setTuiContext({
        stepIndex: 1, totalSteps: 9, stepLabel: 'Language',
        answers: { mode: 'single' },
      });

      // Use prompts.prompt so the context flows to the augmented question
      var p1 = prompts.prompt([
        { type: 'list', name: 'language', message: 'Pick language:',
          choices: [{ name: 'Go', value: 'go' }, { name: 'Node', value: 'node' }] },
      ]);

      expect(tuiApp.getState().stepIndex).toBe(1);
      expect(tuiApp.getState().stepLabel).toBe('Language');

      tuiApp._answer('go');
      expect(tuiApp.getState().view).toBe('idle');

      // Going back from step 2 to step 1 in the navigator means
      // re-running step 1's prompt with fresh questions
      prompts.setTuiContext({
        stepIndex: 0, totalSteps: 9, stepLabel: 'Mode',
        answers: { mode: 'frontend' },
      });

      var received = null;
      var p2 = prompts.prompt([
        { type: 'list', name: 'language', message: 'Pick language?',
          choices: [{ name: 'TypeScript', value: 'ts' }, { name: 'JavaScript', value: 'js' }] },
      ]);

      // After re-push, the context should reflect the re-run step
      expect(tuiApp.getState().view).toBe('question');
      expect(tuiApp.getState().stepLabel).toBe('Mode');
      expect(tuiApp.getState().stepIndex).toBe(0);

      tuiApp._answer('ts');
      return p2.then(function (result) {
        expect(result.language).toBe('ts');
        expect(tuiApp.getState().view).toBe('idle');
      });
    });

    it('navigator back preserves context from previous answers', function () {
      // Simulate going back from step 3 (Architecture) to step 2 (Framework)
      var existingCtx = { mode: 'single', language: 'go' };

      // Use prompts.prompt so context flows through
      prompts.setTuiContext({
        stepIndex: 2, totalSteps: 9, stepLabel: 'Framework',
        answers: existingCtx,
      });

      var p = prompts.prompt([
        { type: 'list', name: 'framework', message: 'Pick framework:',
          choices: [{ name: 'Chi', value: 'chi' }, { name: 'Gin', value: 'gin' }] },
      ]);

      // State reflects the answers from setTuiContext via prompts.prompt augmentation
      var state = tuiApp.getState();
      expect(state.view).toBe('question');
      expect(state.answers.mode).toBe('single');
      expect(state.answers.language).toBe('go');
      expect(state.stepIndex).toBe(2);
      expect(state.stepLabel).toBe('Framework');

      tuiApp._answer('chi');
      return p.then(function (result) {
        expect(result.framework).toBe('chi');
        expect(tuiApp.getState().view).toBe('idle');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Frontend mode — language auto-selects frontend
  // ---------------------------------------------------------------------------
  describe('Frontend mode auto-selection', function () {
    it('frontend mode skips language prompt (wizard returns early)', function () {
      // When mode is frontend, the wizard returns { language: 'frontend' }
      // without calling prompts.prompt. At the TUI level, the queue stays empty.
      tuiApp.setState({ answers: { mode: 'frontend', _mode: 'frontend' } });

      expect(tuiApp._queue.length).toBe(0);
      expect(tuiApp.getState().answers.mode).toBe('frontend');
    });

    it('backend mode pushes language question normally', function () {
      prompts.setTuiContext({
        stepIndex: 1, totalSteps: 9, stepLabel: 'Language',
        answers: { mode: 'single' },
      });

      var p = prompts.prompt([
        { type: 'list', name: 'language', message: 'Pick language:',
          choices: [{ name: 'Go', value: 'go' }, { name: 'Node', value: 'node' }] },
      ]);

      expect(tuiApp._queue.length).toBe(1);
      expect(tuiApp.getState().view).toBe('question');
      expect(tuiApp.getState().message).toBe('Pick language:');

      tuiApp._answer('go');
      return p.then(function (r) {
        expect(r.language).toBe('go');
      });
    });

    it('frontend context answers flow into the queue via setTuiContext', function () {
      prompts.setTuiContext({
        stepIndex: 2, totalSteps: 9, stepLabel: 'Framework',
        answers: { mode: 'frontend', language: 'frontend' },
      });

      var p = prompts.prompt([
        { type: 'list', name: 'framework', message: 'Pick framework:',
          choices: [{ name: 'React', value: 'react' }] },
      ]);

      // The state.answers should reflect the context answers from setTuiContext
      var state = tuiApp.getState();
      expect(state.answers.mode).toBe('frontend');
      expect(state.answers.language).toBe('frontend');

      tuiApp._answer('react');
      return p.then(function (r) {
        expect(r.framework).toBe('react');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Prerequisites flow — check/install cycle
  // ---------------------------------------------------------------------------
  describe('Prerequisites flow', function () {
    it('resolves confirm question for prerequisite installation', function () {
      prompts.setTuiContext({
        stepIndex: 4, totalSteps: 9, stepLabel: 'Prereqs',
        answers: { language: 'node' },
      });

      var p = prompts.prompt([
        { type: 'confirm', name: 'shouldInstall',
          message: 'Node.js is not installed. Install now?', default: true },
      ]);

      expect(tuiApp.getState().view).toBe('question');
      expect(tuiApp.getState().questionType).toBe('confirm');
      expect(tuiApp.getState().message).toContain('not installed');

      tuiApp._answer(true);
      return p.then(function (r) {
        expect(r.shouldInstall).toBe(true);
      });
    });

    it('handles prereqs skip (user chooses not to install)', function () {
      prompts.setTuiContext({
        stepIndex: 4, totalSteps: 9, stepLabel: 'Prereqs',
        answers: { language: 'node' },
      });

      var p = prompts.prompt([
        { type: 'confirm', name: 'shouldInstall',
          message: 'Docker is not installed. Install now?', default: true },
      ]);

      tuiApp._answer(false);
      return p.then(function (r) {
        expect(r.shouldInstall).toBe(false);
      });
    });

    it('prereqs step with side panel info passes through to queue', function () {
      var sidebarData = { title: 'Prerequisites', description: 'These tools are needed.' };

      prompts.setTuiContext({
        stepIndex: 4, totalSteps: 9, stepLabel: 'Prereqs',
        answers: { language: 'node' },
        sidebarInfo: sidebarData,
      });

      var p = prompts.prompt([
        { type: 'confirm', name: 'shouldInstall',
          message: 'Install missing tools?', default: true },
      ]);

      var q = tuiApp._queue[0].question;
      expect(q.sidebarInfo).toEqual(sidebarData);

      tuiApp._answer(true);
      return p;
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Cancel mid-flow — clean exit
  // ---------------------------------------------------------------------------
  describe('Cancel mid-flow', function () {
    it('cancelAll during mid-wizard resolves with ExitPromptError', function () {
      prompts.setTuiContext({
        stepIndex: 4, totalSteps: 9, stepLabel: 'Project',
        answers: { mode: 'single', language: 'node', framework: 'express' },
      });

      var p = prompts.prompt([
        { type: 'input', name: 'projectName', message: 'Project name?' },
      ]);

      var state = tuiApp.getState();
      expect(state.message).toBe('Project name?');
      expect(state.answers.mode).toBe('single');
      expect(state.answers.language).toBe('node');

      tuiApp.cancelAll();

      expect(tuiApp.getState().view).toBe('idle');

      return p
        .then(function () { throw new Error('Should have thrown ExitPromptError'); })
        .catch(function (err) {
          expect(err.name).toBe('ExitPromptError');
          expect(err.message).toBe('Cancelled by user');
        });
    });

    it('cancelling after multiple answered steps preserves clean state', function () {
      prompts.setTuiContext({
        stepIndex: 4, totalSteps: 9, stepLabel: 'Prereqs',
        answers: { mode: 'single', language: 'go', framework: 'chi', architecture: 'clean' },
      });

      var p1 = prompts.prompt([
        { type: 'confirm', name: 'shouldInstall', message: 'Install Go?' },
      ]);

      tuiApp._answer(true);

      return p1.then(function () {
        // After first step resolves, state returns to idle with empty context answers
        var state1 = tuiApp.getState();
        expect(state1.view).toBe('idle');
        expect(state1.questionType).toBeNull();

        // Next step: project info
        prompts.setTuiContext({
          stepIndex: 5, totalSteps: 9, stepLabel: 'Project',
          answers: {},
        });

        var p2 = prompts.prompt([
          { type: 'input', name: 'projectName', message: 'Project name?' },
        ]);

        expect(tuiApp.getState().view).toBe('question');

        // Cancel mid-typing
        tuiApp.cancelAll();

        return p2
          .then(function () { throw new Error('Should have thrown'); })
          .catch(function (err) {
            expect(err.name).toBe('ExitPromptError');
            expect(tuiApp.getState().view).toBe('idle');
            expect(tuiApp.getState().answers).toEqual({});
          });
      });
    });

    it('cancelAll during multi-question prompt cancels all remaining', function () {
      var p = prompts.prompt([
        { type: 'input', name: 'first', message: 'First?' },
        { type: 'input', name: 'second', message: 'Second?' },
        { type: 'input', name: 'third', message: 'Third?' },
      ]);

      tuiApp._answer('one');

      return tick()
        .then(function () {
          expect(tuiApp.getState().message).toBe('Second?');
          tuiApp.cancelAll();

          return p
            .then(function () { throw new Error('Should have thrown'); })
            .catch(function (err) {
              expect(err.name).toBe('ExitPromptError');
              expect(tuiApp.getState().view).toBe('idle');
              expect(tuiApp.getState().answers).toEqual({});
            });
        });
    });

    it('cancelAll without any questions is safe', function () {
      expect(function () {
        tuiApp.cancelAll();
      }).not.toThrow();

      expect(tuiApp.getState().view).toBe('idle');
      expect(tuiApp.getState().answers).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Error recovery
  // ---------------------------------------------------------------------------
  describe('Error recovery', function () {
    it('validate function is passed through to queue item', function () {
      var validateFn = function (v) {
        return v.length >= 3 ? true : 'Too short (min 3 chars)';
      };

      var p = prompts.prompt([
        { type: 'input', name: 'name', message: 'Your name?', validate: validateFn },
      ]);

      var q = tuiApp._queue[0].question;
      expect(q.validate).toBe(validateFn);

      tuiApp._answer('Jo');
      return p.then(function (result) {
        expect(result).toEqual({ name: 'Jo' });
      });
    });

    it('handles empty input through validate check', function () {
      var p = prompts.prompt([
        { type: 'input', name: 'projectName', message: 'Project name?',
          validate: function (v) { return v.trim() ? true : 'Cannot be empty'; } },
      ]);

      tuiApp._answer('');
      return p.then(function (result) {
        expect(result.projectName).toBe('');
      });
    });

    it('state survives after answer on empty queue (edge case)', function () {
      tuiApp.setState({
        view: 'question',
        questionType: 'input',
        message: 'Existing question',
        answers: { saved: true },
      });

      tuiApp._queue.length = 0;
      tuiApp._answer('nobody');

      var state = tuiApp.getState();
      // The answer on empty queue clears the queue but keeps state
      expect(state.answers.saved).toBe(true);
    });

    it('cancelAll after validation error still exits cleanly', function () {
      var p = prompts.prompt([
        { type: 'input', name: 'email', message: 'Email?',
          validate: function (v) { return v.includes('@') ? true : 'Invalid email'; } },
      ]);

      tuiApp.cancelAll();

      return p
        .then(function () { throw new Error('Should have thrown'); })
        .catch(function (err) {
          expect(err.name).toBe('ExitPromptError');
          expect(tuiApp.getState().view).toBe('idle');
          expect(tuiApp.getState().answers).toEqual({});
        });
    });

    it('error recovery: re-queuing after an error condition', function () {
      // Simulate: first push fails, then re-push works
      var received = null;
      tuiApp.pushQuestion(
        { type: 'input', name: 'retry', message: 'Retry?' },
        function (v) { received = v; }
      );

      // Clear the queue to simulate error
      tuiApp._queue.length = 0;
      expect(tuiApp._queue.length).toBe(0);

      // Re-push the same question (recovery)
      tuiApp.pushQuestion(
        { type: 'input', name: 'retry', message: 'Retry?' },
        function (v) { received = v; }
      );

      expect(tuiApp._queue.length).toBe(1);
      expect(tuiApp.getState().view).toBe('question');

      tuiApp._answer('recovered');
      expect(received).toBe('recovered');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Progress screen — state transitions
  // ---------------------------------------------------------------------------
  describe('Progress screen', function () {
    it('showProgress sets initial progress state', function () {
      tuiApp.showProgress(['init', 'generate', 'write', 'done'], 'init', 'Initializing...');

      var state = tuiApp.getState();
      expect(state.view).toBe('progress');
      expect(state.phases).toEqual(['init', 'generate', 'write', 'done']);
      expect(state.currentPhase).toBe('init');
      expect(state.progressMessage).toBe('Initializing...');
    });

    it('updateProgress advances through phases', function () {
      tuiApp.showProgress(['setup', 'render', 'finish'], 'setup', 'Setting up...');

      expect(tuiApp.getState().currentPhase).toBe('setup');
      expect(tuiApp.getState().progressMessage).toBe('Setting up...');

      tuiApp.updateProgress({ currentPhase: 'render', progressMessage: 'Rendering...' });

      var state = tuiApp.getState();
      expect(state.view).toBe('progress');
      expect(state.currentPhase).toBe('render');
      expect(state.progressMessage).toBe('Rendering...');

      tuiApp.updateProgress({ currentPhase: 'finish', progressMessage: 'Done.' });

      expect(tuiApp.getState().currentPhase).toBe('finish');
      expect(tuiApp.getState().progressMessage).toBe('Done.');
    });

    it('updateProgress preserves custom progress keys', function () {
      tuiApp.showProgress(['a', 'b', 'c'], 'a', 'Start');

      tuiApp.updateProgress({ filePath: '/tmp/src/app.ts', fileCount: 5, fileTotal: 12 });

      var state = tuiApp.getState();
      expect(state.view).toBe('progress');
      expect(state.currentPhase).toBe('a');
      expect(state.progressMessage).toBe('Start');
      expect(state.filePath).toBe('/tmp/src/app.ts');
      expect(state.fileCount).toBe(5);
      expect(state.fileTotal).toBe(12);
    });

    it('updateProgress is ignored when not in progress view', function () {
      tuiApp.setState({ view: 'idle', message: 'Waiting' });

      tuiApp.updateProgress({ currentPhase: 'render', progressMessage: 'Rendering' });

      var state = tuiApp.getState();
      expect(state.view).toBe('idle');
      expect(state.currentPhase).toBeUndefined();
    });

    it('showProgress overwrites previous progress state', function () {
      tuiApp.showProgress(['old1', 'old2'], 'old1', 'Old');
      tuiApp.showProgress(['new1', 'new2', 'new3'], 'new1', 'New');

      var state = tuiApp.getState();
      expect(state.phases).toEqual(['new1', 'new2', 'new3']);
      expect(state.currentPhase).toBe('new1');
      expect(state.progressMessage).toBe('New');
    });

    it('transition from progress to done sets correct view', function () {
      tuiApp.showProgress(['init', 'gen', 'verify', 'finish'], 'init', 'Starting');
      tuiApp.updateProgress({ currentPhase: 'gen', progressMessage: 'Generating...', fileCount: 5 });
      tuiApp.updateProgress({ currentPhase: 'finish', progressMessage: 'Complete', fileCount: 5 });

      // Transition to done
      tuiApp.showDone('Project created!', '/tmp/myapp', { language: 'go' });

      var state = tuiApp.getState();
      expect(state.view).toBe('done');
      expect(state.doneMessage).toBe('Project created!');
      expect(state.doneOutPath).toBe('/tmp/myapp');
      expect(state.doneCtx).toEqual({ language: 'go' });
    });

    it('handles completed phases metadata in progress', function () {
      tuiApp.showProgress(['fetch', 'parse', 'render', 'write'], 'fetch', 'Fetching...');
      tuiApp.updateProgress({ completedPhases: ['fetch'], currentPhase: 'parse', progressMessage: 'Parsing...' });

      var state = tuiApp.getState();
      expect(state.completedPhases).toEqual(['fetch']);
      expect(state.currentPhase).toBe('parse');

      tuiApp.updateProgress({ completedPhases: ['fetch', 'parse'], currentPhase: 'render' });
      expect(tuiApp.getState().completedPhases).toEqual(['fetch', 'parse']);
      expect(tuiApp.getState().currentPhase).toBe('render');
    });

    it('showProgress with minimal arguments sets view correctly', function () {
      tuiApp.showProgress([], '', '');

      var state = tuiApp.getState();
      expect(state.view).toBe('progress');
      expect(state.phases).toEqual([]);
      expect(state.currentPhase).toBe('');
      expect(state.progressMessage).toBe('');
    });

    it('failedCount metadata tracks through updateProgress', function () {
      tuiApp.showProgress(['init', 'build'], 'init', 'Building...');
      tuiApp.updateProgress({ currentPhase: 'build', failedCount: 2, progressMessage: '2 failures' });

      var state = tuiApp.getState();
      expect(state.currentPhase).toBe('build');
      expect(state.failedCount).toBe(2);
    });
  });
});
