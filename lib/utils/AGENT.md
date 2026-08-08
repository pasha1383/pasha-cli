# lib/utils/

Shared utility modules.

## `logger.js`
Terminal output helpers wrapping `chalk`:
- `ok(msg)` — green checkmark
- `fail(msg)` — red X
- `warn(msg)` — yellow warning
- `info(msg)` — cyan
- `title(msg)` — bold with preceding newline

Every function is a simple `console.log` wrapper. No return values.

## `exec.js`
Spawns a child process and returns a Promise. Uses Node's built-in `child_process.spawn`
— NOT execa (see AGENT.md root, gotcha #2).

- `run(command, args, options)` — returns `Promise<void>`, rejects with Error
  carrying `.exitCode` / `.signal` / `.code`
- Options: `cwd` (default `process.cwd()`), `stdio` (default `'inherit'`)
- Uses `spawn` syntax: `run('npm', ['install'], { cwd, stdio: 'inherit' })`
