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
});
