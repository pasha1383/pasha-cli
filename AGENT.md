# pasha-cli — Agent Context

Read this in full before touching the codebase. It captures the architecture,
every non-obvious bug already hit and fixed, and the exact pattern to follow
when adding new languages/frameworks/architectures.

## What this project is

`pasha` is a CLI project generator: the user picks a language, a framework, and
an architecture, answers a few stack questions (ORM, database, validation,
cache, message broker), names one or more modules, and gets a working,
`tsc --strict`-clean base project.

- Repo: https://github.com/pasha1383/pasha-cli
- npm package: `@pasha1383/pasha`, bin name `pasha`
- Author: Parsa Shadkam (GitHub: pasha1383)
- Install: `curl -fsSL https://raw.githubusercontent.com/pasha1383/pasha-cli/main/install.sh | bash` (Linux/macOS only)
- Local dev: `npm install && npm link` from the repo root, then `pasha create`

## Quick-start for development

```bash
git clone https://github.com/pasha1383/pasha-cli.git
cd pasha-cli
npm install
npm run link          # symlinks pasha globally
pasha create          # test it
npm run unlink        # remove global symlink
```

## Directory map

`lib/` was an older, fully-parallel implementation of this CLI — dead code,
deleted. Everything documented below is the real, currently-shipped code
under `src/`.

```
pasha-cli/
├── bin/pasha.js                       entrypoint — just `require('../src/cli').program.parse()`
├── install.sh                         one-liner installer: clones repo, npm installs, symlinks
├── .github/workflows/publish.yml      tag-triggered npm publish (v*)
├── src/
│   ├── cli/
│   │   ├── index.js                   commander setup — default action (create), doctor,
│   │   │                              add <module|feature>, explain <recipe>, list
│   │   └── commands/
│   │       ├── create.js              the wizard — see "Wizard flow" below
│   │       ├── doctor.js              checks/installs node/npm/git/python3/go/java/…
│   │       ├── add.js                 adds a module to an already-generated project
│   │       └── explain.js             prints the resolved layer tree for a layers/recipes
│   │                                  recipe (see "Layers & recipes" below) — display only
│   ├── core/
│   │   ├── catalog/manifest.js        loads templates/manifest.json; getLanguages/
│   │   │                              getFrameworks/getArchitectures/getTemplateDir build
│   │   │                              the {name, value} choice lists the prompt layer renders
│   │   ├── engine/
│   │   │   ├── renderer.js            renderString/renderTemplateDir/renderModuleFiles —
│   │   │   │                          the Handlebars render engine, see "Engine internals" below
│   │   │   ├── helpers.js             registers pascalCase/camelCase/constantCase/snakeCase/
│   │   │   │                          kebabCase/eq/shellDefault on the Handlebars instance
│   │   │   ├── conditions.js          parseCondition/makeIncludeCheck — fileConditions →
│   │   │   │                          boolean-expression evaluation and path gating
│   │   │   ├── errors.js              TemplateRenderError (message, templatePath, line, column)
│   │   │   └── layers.js              the layers/recipes composition system (see below)
│   │   ├── features/                  one module per stack flavor (nestjs.js, express.js,
│   │   │   │                          fastify.js, python.js, go.js, spring-boot.js, rails.js,
│   │   │   │                          react.js, …) — each exports ormChoices/databaseChoices/
│   │   │   │                          validationChoices/brokerChoices/extraFeatureChoices/
│   │   │   │                          deriveFlags/resolveDependencies/resolveScripts
│   │   │   ├── index.js               REGISTRY of all flavors + resolveFeatures(flavor);
│   │   │   │                          validates at load time that every module implements
│   │   │   │                          the full required interface
│   │   │   └── shared.js              cross-flavor constants (ORM_DATABASE_SUPPORT,
│   │   │                              DATABASE_LABELS, DEFAULT_PORTS)
│   │   ├── session/
│   │   │   ├── history.js             saves/loads/lists past wizard sessions under
│   │   │   │                          ~/.pasha-cli/sessions for `--resume`
│   │   │   └── presets.js             `--preset`/`--save-preset` JSON answer files
│   │   ├── system/
│   │   │   ├── exec.js                child_process.spawn wrapper — NOT execa, see gotcha #2
│   │   │   └── prerequisites.js       commandExists/resolveCommandPath/installTool,
│   │   │                              see gotcha #3
│   │   └── wizard/navigator.js        Navigator — a linear step list with back/forward,
│   │                                  loop-guard, and error handling, driving both the TUI
│   │                                  and the plain sequential prompt flows
│   ├── ui/
│   │   ├── prompts.js                 prompt(questions) — routes to the Ink TUI
│   │   │                              (setTuiMode/setTuiApp) or a readline-based fallback;
│   │   │                              no inquirer anywhere in src/, see gotcha #10
│   │   ├── io.js, layout.js, theme.js  plain-mode output helpers, layout constants, colors
│   │   ├── screens/                   welcome/progress/summary/error/done screens (plain mode)
│   │   └── tui/                       the Ink-based interactive TUI: app.js + components/
│   │                                  (SelectPrompt, MultiSelectPrompt, InputPrompt,
│   │                                  ConfirmPrompt, ProgressScreen, StepRail, …)
│   └── utils/
│       ├── logger.js                  ok/fail/warn/info/title console helpers
│       └── strings.js                 pascalCase/camelCase/constantCase/snakeCase/kebabCase
├── templates/
│   ├── manifest.json                  language → framework → architecture → template dir
│   ├── _shared/<stack>/files/         root files reused by every architecture of a stack
│   ├── <template-dir>/                one directory per language+framework+architecture
│   │                                  combination (e.g. node-nestjs-hexagonal,
│   │                                  node-express-layered, python-fastapi-modular, …)
│   ├── layers/, recipes/              a newer, separate composition system — see
│   │                                  "Layers & recipes" below; NOT used by `pasha create`
│   └── … (100+ template dirs — run `pasha list` for the live set)
```

Every `<template-dir>` has:
- `template.json` — `prerequisites`, `shared`, `stackFeatures`, `modules` config,
  `fileConditions`, `postInstall`, `gitInit`.
- `files/` — rendered exactly once.
- `moduleFiles/` — rendered once **per module**, with `moduleName` merged into context.

### Layers & recipes (`src/core/engine/layers.js`)

`templates/layers/` (base / lang / framework / architecture / feature layers) and
`templates/recipes/*.json` (which layers a recipe composes, bottom-up) are a second,
independent way of describing a generated stack, resolved by `resolveRecipe()`. It is
currently wired into exactly one place: `pasha explain <recipe>`, for *displaying* the
resolved layer tree and merged config to a human. **`pasha create` does not use it** —
the wizard reads `template.json`'s own `fileConditions` directly via `makeIncludeCheck`.
Don't assume recipes affect what actually gets generated until/unless that changes.

## `template.json` structure

```json
{
  "name": "Display name",
  "prerequisites": ["node", "npm", "git"],
  "shared": "_shared/nestjs",          // or null if no shared files
  "stackFeatures": "nestjs",            // any key in REGISTRY (src/core/features/index.js), or false
  "modules": {
    "enabled": true,
    "message": "Module/entity name (e.g. product, user, order)",
    "default": "product"
  },
  "fileConditions": {
    "path/prefix": "ctxFlagName",       // file/dir only included when ctx[flagName] is truthy
    "src/shared/database/prisma.module.ts.hbs": "ormPrisma"
  },
  "postInstall": ["npm install"],
  "gitInit": true
}
```

## Engine internals (`src/core/engine/renderer.js` + `conditions.js`)

Handlebars helpers registered (`src/core/engine/helpers.js`): `pascalCase`, `camelCase`,
`constantCase`, `snakeCase`, `kebabCase`, `eq` (block helper), `shellDefault` (see gotcha #1).

- `renderTemplateDir(srcDir, destDir, ctx, shouldInclude, relBase, onProgress)` (renderer.js) —
  walks tree, renders file/dir names and `.hbs` content, strips `.hbs` extension, copies bare
  files verbatim, skips anything `shouldInclude()` rejects.
- `renderModuleFiles(srcDir, destDir, ctx, moduleNames, shouldInclude, onProgress)` (renderer.js) —
  calls the above once per module name with `moduleName` merged into a **copy** of the base
  context (the base ctx object itself is never mutated).
- `makeIncludeCheck(conditions, ctx)` (conditions.js) — for each entry in `fileConditions`, if
  the path prefix matches AND the condition string (parsed by `parseCondition` — supports
  `flagName`, `!flagName`, `a && b`, `a || b`, and the literal booleans `true`/`false`) evaluates
  falsy against `ctx`, the file/dir is excluded. Multiple matching conditions AND together. No
  override mechanism in the fileConditions the engine actually reads — a file nested under a
  gated directory inherits the gate (see gotcha #8). (`layers.js`'s separate `!`-prefixed
  "force-include" encoding used by the layers/recipes system is a different mechanism —
  see gotcha #9.)
- `compileTemplate`/`renderString` cache compiled templates by source string and wrap a
  Handlebars parse error as `TemplateRenderError` (`errors.js`), which stores the failing
  line under `.line` — **not** `.lineNumber` (see gotcha #10).

## Wizard flow (`src/cli/commands/create.js`)

There are three entry points sharing the same step logic: `createTui` (the default,
Ink-based interactive TUI), `createInteractive` (`--plain`, sequential readline prompts),
and `createNonInteractive` (`--yes` / enough CLI flags supplied, no prompts at all). All
three walk roughly the same steps:

1. language → framework → architecture (from `templates/manifest.json`, via
   `src/core/catalog/manifest.js`)
2. prerequisite check (`templateConfig.prerequisites`, via `src/core/system/prerequisites.js`)
3. project info: `projectName`, `author`, `github`, `description`
4. if `templateConfig.stackFeatures` is truthy: `resolveFeatures(flavor)`
   (`src/core/features/index.js`) picks the flavor's feature module, then
   `runStackWizard`/`_buildStackSteps` asks (non-frontend flavors only for the first four):
   ORM → database (by ORM support) → Redis → broker → validation (always) → AGENT.md
   (always) → extras checkbox, if the flavor exports `extraFeatureChoices` (not NestJS-only
   any more — every stack flavor can define its own extras list)
5. modules: count and names (lowercase, `[a-z0-9-]`, no duplicates)
6. context assembly (`buildContext`): base answers + flags + modules + architectureLabel +
   language/framework + dbName + pre-stringified JSON dependencies/scripts
7. render (`renderProject`): shared `files/` → template `files/` → template `moduleFiles/`
   (per module)
8. `npm install` using resolved absolute path to npm
9. optional `git init && git add . && git commit`

Navigation (back/forward through steps, loop-guard against getting stuck) is handled by
`src/core/wizard/navigator.js`'s `Navigator`, shared by both the TUI and plain flows.

## Bugs already hit and fixed — DO NOT REINTRODUCE

### #1 — Handlebars brace collision
`${DB_NAME:-{{snakeCase projectName}}}` breaks: `}}` sits against `}` producing `}}}`,
lexed as triple-mustache close with no matching open → parse error at render time.
**Fix:** use the `shellDefault(varName, fallback)` helper. **Rule:** never let
`{{expr}}` sit next to a literal `}`.

### #2 — execa's CommonJS export shape
`execa` v5 does `module.exports = execa` — `const { execa } = require('execa')` resolves
to `undefined`. v6+ is ESM-only. **Fix:** `src/core/system/exec.js` wraps
`child_process.spawn` directly.

### #3 — PATH resolution via spawned login shell
`bash -lc "command -v X"` skips `~/.bashrc` on most distros, hiding nvm-added tools.
**Fix:** `src/core/system/prerequisites.js` walks `process.env.PATH` via `fs.accessSync`.

### #4 — DI token casing
`{{constantCase moduleName}}_REPOSITORY` must be identical everywhere (interface,
use-cases, module wiring, specs). A mismatch creates a different nonexistent symbol.

### #5 — Mongoose `.lean()` typing
Type `.lean()` result explicitly as a narrow literal, construct domain class manually.

### #6 — `Transport.KAFKA as const` is invalid
`as const` only works on literals, not enum members. Just write `Transport.KAFKA`.

### #7 — DTO fields under `strict: true`
`name: string;` → TS2564. Use `name!: string;` — the one sanctioned non-null assertion.

### #8 — Unconditional files in gated directories
`fileConditions` ANDs every matching prefix with no override. Files needed unconditionally
must never live under a conditionally-gated directory. Error classes were moved from
`src/shared/` (gated) to `src/errors/` (ungated) for this reason.

### #10 — TemplateRenderError line numbers, and Handlebars' error shapes
`Handlebars.compile()` is lazy (see its own compiler.js: "Template is only compiled on
first use") — it essentially never throws synchronously; the real parse error surfaces
later, when the compiled function is first invoked with a context, i.e. inside
`renderString`. That raw error's shape varies by error class: a semantic AST error (e.g.
mismatched `{{#if}}`/`{{/unless}}`) is a `Handlebars.Exception` with a real `.lineNumber`;
a raw syntax error from the underlying parser (e.g. gotcha #1's brace collision) has
**no** `.lineNumber` at all — only "Parse error on line N:" in the message text; and a
`TemplateRenderError` we already threw and are re-wrapping carries the line under `.line`
(`src/core/engine/errors.js`), never `.lineNumber`. A naive `err.lineNumber || null` at a
re-wrap site silently loses the line for two of these three shapes. **Fix:**
`renderer.js`'s `extractLine(err)` checks `.line`, then `.lineNumber`, then falls back to
regex-extracting the number from `err.message` — covering all three.

## Conventions

- **English only** in pasha-cli code/docs and all generated content
- Generated TypeScript: `"strict": true`, no `any`, no non-null assertions (except DTOs)
- Naming: kebab-case filenames, PascalCase classes, camelCase members, CONSTANT_CASE
  DI tokens, snake_case DB names
- Dependency/script objects computed in JS, injected as pre-stringified JSON via
  `{{{triple-stash}}}` in templates — never assembled as raw JSON inside a template
- Every meaningful generated directory gets an `AGENT.md` (when the option is on)
- **Never** nest files that must exist unconditionally under any gated directory prefix

## Adding a new language / framework / architecture

1. Add entry to `templates/manifest.json`:
   `languages.<lang>.frameworks.<fw>.architectures.<arch> = { label, template: "<dir>" }`
2. Create `templates/<dir>/template.json` with `shared`, `stackFeatures`, `fileConditions`
   — `stackFeatures` is the flavor key `resolveFeatures()` will look up
3. Create `templates/<dir>/files/` and optionally `moduleFiles/`
4. If the stack questions differ, write `src/core/features/<flavor>.js` exporting:
   `ormChoices`, `databaseChoices`, `brokerChoices`, `validationChoices`,
   `extraFeatureChoices`, `deriveFlags()`, `resolveDependencies()`, `resolveScripts()`,
   optionally `resolveJestConfig()` (pull shared constants like `ORM_DATABASE_SUPPORT`
   from `src/core/features/shared.js` rather than duplicating them)
5. Register it in the `REGISTRY` object in `src/core/features/index.js` — this is already
   a flavor → module registry (`resolveFeatures(flavor)` looks it up directly), so nothing
   else needs to change in `src/cli/commands/create.js` to pick it up. The registry
   validates at load time that the new module implements the full required interface.
6. Validate by rendering all meaningful flag combos and running `tsc --strict --noEmit`,
   and run `npm run validate:templates` (`tools/validate-templates.js`) to catch dead
   `fileConditions`, unbalanced Handlebars blocks, and flags the templates reference but
   the features module doesn't produce.

## Testing methodology

Render every meaningful flag combination (ORM × database × validation × broker × extras,
per architecture) and run `tsc --noEmit --strict` against each. Ideally also `npm install`
and boot at least one combination to verify it actually runs.

## Full roadmap

| Language | Framework | Architectures | Status |
|---|---|---|---|
| Node.js/TS | NestJS | Layered, Clean, Hexagonal | Done (full extras) |
| Node.js/TS | Express | Layered | Done (core only, no extras) |
| Node.js/TS | Fastify, Koa, Hapi, AdonisJS | — | Not started |
| Node.js/TS | Next.js, Nuxt, Remix, Astro, SvelteKit | — | Not started |
| Node.js/TS | React, Vue, Angular, Svelte, SolidJS | — | Not started — frontend needs its own flag model |
| Python | Django, FastAPI, Flask, Litestar, Tornado | — | Next planned phase |
| Go | Gin, Echo, Fiber, Chi, net/http | — | Not started |
| Java/Kotlin | Spring Boot, Micronaut, Quarkus, Ktor | — | Not started |
| C#/.NET | ASP.NET Core, Minimal API | — | Not started |
| Rust | Actix-web, Axum, Rocket | — | Not started |
| PHP | Laravel, Symfony, Slim | — | Not started |
| Ruby | Rails, Sinatra | — | Not started |
| Swift | Vapor | — | Not started |
| Dart | Flutter | — | Not started |
| Shell | Bash/POSIX | — | Not started |

## Known gaps

1. Custom Swagger CSS from Parsa was never integrated
2. 8 NestJS extras not ported to Express yet
3. Only one combo (NestJS/Hexagonal/Prisma/Postgres) has been actually booted by a human
4. `install.sh` and `publish.yml` haven't been re-verified since the Express work landed
5. `pasha doctor` only covers node/npm/git/python3/go/java — new languages need entries
