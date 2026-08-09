'use strict';
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

// {{pascalCase moduleName}} -> ProductVariant  |  {{camelCase moduleName}} -> productVariant
Handlebars.registerHelper('pascalCase', (str) =>
  String(str)
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
);
Handlebars.registerHelper('camelCase', (str) => {
  const p = String(str)
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return p.charAt(0).toLowerCase() + p.slice(1);
});
// {{constantCase moduleName}} -> PRODUCT_VARIANT (for DI tokens, env keys, etc.)
Handlebars.registerHelper('constantCase', (str) =>
  String(str)
    .split(/[-_\s]+/)
    .join('_')
    .toUpperCase()
);
// {{snakeCase moduleName}} -> product_variant (for table/collection names)
Handlebars.registerHelper('snakeCase', (str) =>
  String(str)
    .split(/[-\s]+/)
    .join('_')
    .toLowerCase()
);
// {{#eq a "value"}}...{{else}}...{{/eq}} — compare two values in a block
Handlebars.registerHelper('eq', function eq(a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this);
});
// {{shellDefault "DB_NAME" dbName}} -> ${DB_NAME:-my_app}
//
// Writing `${DB_NAME:-{{dbName}}}` directly is a parse error: the shell's
// closing brace lands against Handlebars' `}}`, and the resulting `}}}` is
// lexed as an unescaped-close token. Emitting the whole expression from a
// helper keeps the braces out of the template entirely.
Handlebars.registerHelper('shellDefault', (varName, fallback) =>
  '${' + varName + ':-' + fallback + '}'
);

function renderString(str, ctx) {
  return Handlebars.compile(str, { noEscape: true })(ctx);
}

/**
 * Builds a predicate deciding whether a template path is generated at all.
 *
 * `conditions` maps a path prefix (relative to the template root) to the name
 * of a context flag. When the flag is falsy the whole file or directory is
 * skipped. This is how "only scaffold Prisma files when the user picked
 * Prisma" works without wrapping every template in {{#if}} blocks.
 */
function makeIncludeCheck(conditions = {}, ctx = {}) {
  const entries = Object.entries(conditions);
  return function shouldInclude(relPath) {
    for (const [prefix, flag] of entries) {
      const normalized = prefix.replace(/\/+$/, '');
      if (relPath === normalized || relPath.startsWith(normalized + '/')) {
        if (typeof flag === 'boolean') return flag;
        if (typeof flag !== 'string') {
          throw new Error(
            `fileConditions value for "${prefix}" must be a string (context flag name) ` +
            `or a boolean literal, got ${typeof flag}`
          );
        }
        if (!ctx[flag]) return false;
      }
    }
    return true;
  };
}

// Walks the whole template tree:
// - renders file/directory names (so {{moduleName}} in paths gets substituted)
// - renders the content of .hbs files and strips the .hbs extension
// - copies every other file (e.g. .gitignore) verbatim
// - skips anything shouldInclude() rejects
async function renderTemplateDir(srcDir, destDir, ctx, shouldInclude, relBase) {
  const include = shouldInclude || (() => true);
  const base = relBase || '';
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const relPath = base ? base + '/' + entry.name : entry.name;

    if (!include(relPath)) continue;

    const isHbs = entry.name.endsWith('.hbs');
    const renderedName = renderString(isHbs ? entry.name.slice(0, -4) : entry.name, ctx);
    const destPath = path.join(destDir, renderedName);

    if (entry.isDirectory()) {
      await fs.ensureDir(destPath);
      await renderTemplateDir(srcPath, destPath, ctx, include, relPath);
    } else if (isHbs) {
      const content = await fs.readFile(srcPath, 'utf8');
      await fs.ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, renderString(content, ctx), 'utf8');
    } else {
      await fs.ensureDir(path.dirname(destPath));
      await fs.copy(srcPath, destPath);
    }
  }
}

// Renders a per-module template tree once for each module name. Every pass
// gets the same base context plus `moduleName` set to that module, so paths
// and contents containing {{moduleName}} resolve to that module's slice.
async function renderModuleFiles(srcDir, destDir, ctx, moduleNames, shouldInclude) {
  for (const moduleName of moduleNames) {
    await renderTemplateDir(srcDir, destDir, Object.assign({}, ctx, { moduleName }), shouldInclude);
  }
}

module.exports = {
  renderTemplateDir,
  renderModuleFiles,
  renderString,
  makeIncludeCheck,
};
