# lib/

The core library. Divided into three subdirectories:

- `commands/` — CLI command implementations (one file per command)
- `core/` — business logic: manifest parsing, template engine, feature resolution,
  prerequisite checking
- `utils/` — shared utilities: process execution, logging

Dependencies that flow through `lib/`:
- `chalk` — colored terminal output (v4, CommonJS)
- `commander` — CLI framework (v12+)
- `fs-extra` — filesystem operations with promises
- `handlebars` — template engine (v4)
- `inquirer` — interactive prompts (v8)
- `ora` — spinners (v5)

All modules use `'use strict'` and `require()` (CommonJS). No ESM anywhere.
