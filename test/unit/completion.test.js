'use strict';

const { completion, COMMANDS } = require('../../src/cli/commands/completion');

describe('completion', () => {
  let logSpy;
  let exitSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('lists all commands registered in the CLI', () => {
    expect(COMMANDS).toEqual(
      expect.arrayContaining(['create', 'doctor', 'add', 'explain', 'update', 'completion']),
    );
  });

  it('prints a bash completion script containing all top-level commands', async () => {
    await completion('bash');
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('complete -F _pasha_completions pasha');
    for (const cmd of COMMANDS) {
      expect(output).toContain(cmd);
    }
  });

  it('prints a zsh completion script with #compdef header', async () => {
    await completion('zsh');
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('#compdef pasha');
    expect(output).toContain('compdef _pasha pasha');
  });

  it('prints a fish completion script using complete -c pasha', async () => {
    await completion('fish');
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('complete -c pasha');
    for (const cmd of COMMANDS) {
      expect(output).toContain(`-a '${cmd}'`);
    }
  });

  it('includes install instructions as a header comment', async () => {
    await completion('bash');
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('pasha completion bash >> ~/.bashrc');
  });

  it('errors and exits non-zero for an unsupported shell', async () => {
    await completion('powershell');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
