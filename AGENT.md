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

```
pasha-cli/
├── bin/pasha.js                      entrypoint — commander: create, doctor, hello, info
├── install.sh                        one-liner installer: clones repo, npm installs, symlinks
├── .github/workflows/publish.yml     tag-triggered npm publish (v*)
├── lib/
│   ├── commands/
│   │   ├── create.js                 the wizard — see "Wizard flow" below
│   │   └── doctor.js                 checks/installs node/npm/git/python3/go/java
│   ├── core/
│   │   ├── manifest.js               loads templates/manifest.json, builds inquirer choice lists
│   │   ├── engine.js                 Handlebars render engine + helpers + conditional inclusion
│   │   ├── prerequisites.js          commandExists/resolveCommandPath/installTool
│   │   ├── features.js               NestJS stack-feature resolution (flags/deps/scripts)
│   │   └── features-express.js       Express stack-feature resolution (flags/deps/scripts)
│   └── utils/
│       ├── logger.js                 ok/fail/warn/info/title console helpers
│       └── exec.js                   child_process.spawn wrapper — NOT execa, see gotcha #2
├── templates/
│   ├── manifest.json                 language → framework → architecture → template dir
│   ├── _shared/nestjs/files/         root files reused by all 3 NestJS architectures
│   ├── node-nestjs-hexagonal/        domain / application / infrastructure
│   ├── node-nestjs-layered/          modules/<name>/{controller,service,repository,entity,dto}
│   ├── node-nestjs-clean/            core / adapters / modules
│   └── node-express-layered/         routes/<name>/{entity,repository,service,controller,routes,validation}
```

Every template directory has:
- `template.json` — `prerequisites`, `shared`, `stackFeatures`, `modules` config,
  `fileConditions`, `postInstall`, `gitInit`.
- `files/` — rendered exactly once.
- `moduleFiles/` — rendered once **per module**, with `moduleName` merged into context.

## `template.json` structure

```json
{
  "name": "Display name",
  "prerequisites": ["node", "npm", "git"],
  "shared": "_shared/nestjs",          // or null if no shared files
  "stackFeatures": "nestjs",            // "nestjs" | "express" | false
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

## Engine internals (`lib/core/engine.js`)

Handlebars helpers registered: `pascalCase`, `camelCase`, `constantCase`, `snakeCase`,
`eq` (block helper), `shellDefault` (see gotcha #1).

- `renderTemplateDir(srcDir, destDir, ctx, shouldInclude, relBase)` — walks tree, renders
  file/dir names and `.hbs` content, strips `.hbs` extension, copies bare files verbatim,
  skips anything `shouldInclude()` rejects.
- `renderModuleFiles(srcDir, destDir, ctx, moduleNames, shouldInclude)` — calls the above
  once per module name with `moduleName` in the context.
- `makeIncludeCheck(conditions, ctx)` — for each entry in `fileConditions`, if the path
  prefix matches AND `ctx[flagName]` is falsy, the file/dir is excluded. Multiple
  matching conditions AND together. No override mechanism — a file nested under a gated
  directory inherits the gate (see gotcha #8).

## Wizard flow (`lib/commands/create.js`)

1. language → framework → architecture (from `templates/manifest.json`)
2. prerequisite check (`templateConfig.prerequisites`)
3. project info: `projectName`, `author`, `github`, `description`
4. if `templateConfig.stackFeatures` is truthy:
   - `askCoreStack(featuresModule)`: ORM → database (by ORM support) → validation →
     Redis → broker → AGENT.md
   - if `nestjs`: also a checkbox of 8 extras (Swagger, lint, tests, CI, auth, health,
     Dockerfile, rate limiting)
   - if `express`: core stack only
5. modules: count and names (lowercase, `[a-z0-9-]`, no duplicates)
6. context assembly: base answers + flags + modules + architectureLabel +
   language/framework + dbName + pre-stringified JSON dependencies/scripts
7. render: shared `files/` → template `files/` → template `moduleFiles/` (per module)
8. `npm install` using resolved absolute path to npm
9. optional `git init && git add . && git commit`

## Bugs already hit and fixed — DO NOT REINTRODUCE

### #1 — Handlebars brace collision
`${DB_NAME:-{{snakeCase projectName}}}` breaks: `}}` sits against `}` producing `}}}`,
lexed as triple-mustache close with no matching open → parse error at render time.
**Fix:** use the `shellDefault(varName, fallback)` helper. **Rule:** never let
`{{expr}}` sit next to a literal `}`.

### #2 — execa's CommonJS export shape
`execa` v5 does `module.exports = execa` — `const { execa } = require('execa')` resolves
to `undefined`. v6+ is ESM-only. **Fix:** `lib/utils/exec.js` wraps
`child_process.spawn` directly.

### #3 — PATH resolution via spawned login shell
`bash -lc "command -v X"` skips `~/.bashrc` on most distros, hiding nvm-added tools.
**Fix:** `lib/core/prerequisites.js` walks `process.env.PATH` via `fs.accessSync`.

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
3. Create `templates/<dir>/files/` and optionally `moduleFiles/`
4. If the stack questions differ, write `lib/core/features-<flavor>.js` exporting:
   `ormChoices`, `databaseChoices`, `brokerChoices` (reuse from `features.js`),
   `validationChoices`, `deriveFlags()`, `resolveDependencies()`, `resolveScripts()`,
   optionally `resolveJestConfig()`
5. Extend `stackFlavor` selection in `lib/commands/create.js` — currently a ternary;
   make it a registry once a third flavor exists
6. Validate by rendering all meaningful flag combos and running `tsc --strict --noEmit`

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
