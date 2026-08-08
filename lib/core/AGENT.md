# lib/core/

Business logic modules for pasha-cli.

## `manifest.js`
Reads `templates/manifest.json` and exposes helpers to build inquirer choice lists:
- `loadManifest()` — async, reads and parses manifest.json
- `getLanguages(manifest)` — `{ name, value }` list
- `getFrameworks(manifest, langKey)` — frameworks for a language
- `getArchitectures(manifest, langKey, fwKey)` — architectures for a framework
- `getTemplateDir(manifest, langKey, fwKey, archKey)` — resolves to template directory name

## `engine.js`
Handlebars-based template rendering. Registered helpers:
- `pascalCase` — `product-variant` → `ProductVariant`
- `camelCase` — `product-variant` → `productVariant`
- `constantCase` — `product-variant` → `PRODUCT_VARIANT`
- `snakeCase` — `product-variant` → `product_variant`
- `eq` — `{{#eq a "value"}}...{{else}}...{{/eq}}`
- `shellDefault` — `{{shellDefault "DB_NAME" dbName}}` → `${DB_NAME:-value}`

Core functions:
- `renderTemplateDir(srcDir, destDir, ctx, shouldInclude, relBase)` — recursively renders
  file/dir names and `.hbs` content, copies non-hbs files, skips excluded paths
- `renderModuleFiles(srcDir, destDir, ctx, moduleNames, shouldInclude)` — calls
  `renderTemplateDir` for each module name with `moduleName` in context
- `makeIncludeCheck(conditions, ctx)` — builds a predicate from `fileConditions`

## `features.js` (NestJS)
Stack feature resolution for all NestJS templates:
- `ormChoices()`, `databaseChoices(orm)`, `validationChoices()`, `brokerChoices()`,
  `extraFeatureChoices()` — inquirer choice lists
- `deriveFlags(answers)` — maps raw answers to boolean flags for templates
- `resolveDependencies(flags)` — maps flags to npm dependencies/devDependencies
- `resolveScripts(flags)` — maps flags to package.json scripts
- `resolveJestConfig()` — returns jest config for package.json

Exports shared constants: `ORM_DATABASE_SUPPORT`, `DATABASE_LABELS`

## `features-express.js` (Express)
Same pattern as `features.js` but adapted for Express:
- Reuses `ormChoices`, `databaseChoices`, `brokerChoices` from `features.js`
- Own `validationChoices()` — `express-validator` instead of `class-validator`
- `deriveFlags()` — subset of NestJS flags (no extras, no auth, no swagger, etc.)
- `resolveDependencies()` — Express deps (express, dotenv, helmet, morgan, etc.)
- `resolveScripts()` — Express scripts (tsx watch, tsc build)

## `prerequisites.js`
System tool detection and installation. Key details:
- `PLATFORM` — `os.platform()`, evaluated at require time
- `SUPPORTED_PLATFORMS` — `['darwin', 'linux']`
- `resolveCommandPath(cmd)` — walks `process.env.PATH` directly (no subshell)
- `commandExists(cmd)` — synchronous check
- `detectLinuxPackageManager()` — checks for apt-get, dnf, pacman
- `installTool(tool)` — installs via detected package manager
