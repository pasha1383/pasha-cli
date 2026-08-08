# bin/

Entry point for the `pasha` CLI.

## `bin/pasha.js`
- Shebang: `#!/usr/bin/env node`
- Uses `commander` to define commands
- Requires `chalk` for colored output
- Commands: `create`, `doctor`, `hello`, `info`
- The ASCII-art `BANNER` is printed via `addHelpText('beforeAll', BANNER)`
- Raw ANSI codes in BANNER (`\u001b[36m`) — chalk is the preferred pattern elsewhere; if you touch this, consider switching to `chalk.cyan()`
- `hello` is a debug/vanity command, not user-facing functionality
- `info` prints package metadata

When adding a new command, follow the pattern:
1. Import the command handler from `lib/commands/`
2. Add `.command('<name>')` with `.description()` and `.action()`
3. Use `async` handler if the command is async — commander supports it natively
