# templates/

Template files that produce generated projects. The template system has four parts:

## `manifest.json`
Maps language → framework → architecture → template directory name. This is the
single source of truth for what combinations exist. Each entry has a `label`
(display name) and `template` (directory name under `templates/`).

## Template directories
Each directory (e.g. `node-nestjs-layered/`) contains:
- `template.json` — configuration (shared files, stack features, modules, file
  conditions, post-install steps, git init)
- `files/` — rendered once into the output directory (project root files)
- `moduleFiles/` — rendered once per user-named module (per-entity files)

## `_shared/nestjs/`
Common files shared across all NestJS templates. The `shared` field in each NestJS
`template.json` points here. Rendered first, so individual templates can override
shared files if needed (though this isn't currently used).

## How rendering works
1. Shared `files/` rendered first (if `shared` is set)
2. Template's own `files/` rendered (can override shared files)
3. Template's `moduleFiles/` rendered once per module name

During rendering:
- `.hbs` files have their content processed by Handlebars and the `.hbs` extension stripped
- Non-`.hbs` files are copied verbatim
- Directory names are also Handlebars-processed (so `{{moduleName}}` in paths resolves)
- `fileConditions` from `template.json` controls conditional inclusion

## Adding a new template
1. Add the combination to `templates/manifest.json`
2. Create the template directory with `template.json`, `files/`, and optionally
   `moduleFiles/`
3. If the stack questions need a new flavor, create `lib/core/features-<name>.js`
4. Wire the flavor into `lib/commands/create.js`
