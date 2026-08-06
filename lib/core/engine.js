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

function renderString(str, ctx) {
  return Handlebars.compile(str, { noEscape: true })(ctx);
}

// Walks the whole templates/<template>/files tree:
// - renders file/directory names (so {{moduleName}} in paths gets substituted)
// - renders the content of .hbs files and strips the .hbs extension
// - copies every other file (e.g. .gitignore) verbatim
async function renderTemplateDir(srcDir, destDir, ctx) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const isHbs = entry.name.endsWith('.hbs');
    const renderedName = renderString(isHbs ? entry.name.slice(0, -4) : entry.name, ctx);
    const destPath = path.join(destDir, renderedName);

    if (entry.isDirectory()) {
      await fs.ensureDir(destPath);
      await renderTemplateDir(srcPath, destPath, ctx);
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

module.exports = { renderTemplateDir, renderString };
