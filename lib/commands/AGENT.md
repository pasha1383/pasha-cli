# lib/commands/

CLI command implementations. Each file exports a function that the `commander`
entries in `bin/pasha.js` call.

## `create.js`
The main wizard. Flow:
1. Load manifest → language/framework/architecture selection
2. Prerequisite check (`checkAll` from `prerequisites.js`)
3. Project info (name, author, github, description)
4. Stack questions (`askCoreStack` + optional extras checkbox for NestJS)
5. Module naming (count and per-name input with validation)
6. Context assembly (answers → flags via `deriveFlags`, dependencies/scripts as JSON)
7. Directory existence check → `renderTemplateDir` (shared + template files) →
   `renderModuleFiles` (per module)
8. `npm install` (with resolved npm path, no subshell PATH ambiguity)
9. Optional `git init && git add . && git commit`

Key pattern: `askCoreStack(featuresModule)` is framework-agnostic — takes a features
module (`features.js` or `features-express.js`) and asks the same ORM/DB/validation/
Redis/broker questions. Only `validationChoices()` differs between frameworks.

`makeIncludeCheck(templateConfig.fileConditions, ctx)` produces a predicate that
selectively skips files/dirs. Used by both `renderTemplateDir` and `renderModuleFiles`.

When adding a new framework with extras: follow `askStackFeaturesNest()` pattern —
call `askCoreStack()` then a framework-specific extras checkbox.

## `doctor.js`
Checks and optionally installs system tools (node, npm, git, python3, go, java).
Uses `checkAll()` (synchronous) from `prerequisites.js`. Asks which missing tools to
install, then calls `installTool()` for each.
