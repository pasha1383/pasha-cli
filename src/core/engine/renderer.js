'use strict';
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');
require('./helpers');
const { makeIncludeCheck } = require('./conditions');
const { TemplateRenderError } = require('./errors');

const compileCache = new Map();

function compileTemplate(src) {
  if (compileCache.has(src)) return compileCache.get(src);
  try {
    const tpl = Handlebars.compile(src, { noEscape: true });
    compileCache.set(src, tpl);
    return tpl;
  } catch (err) {
    throw new TemplateRenderError(err.message, { templatePath: null, line: err.lineNumber });
  }
}

function renderString(str, ctx) {
  return compileTemplate(str)(ctx);
}

async function countFilesInTemplateDir(srcDir, shouldInclude, relBase) {
  const include = shouldInclude || (() => true);
  const base = relBase || '';
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const relPath = base ? base + '/' + entry.name : entry.name;
    if (!include(relPath)) continue;
    const srcPath = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      count += await countFilesInTemplateDir(srcPath, include, relPath);
    } else {
      count++;
    }
  }
  return count;
}

async function renderTemplateDir(srcDir, destDir, ctx, shouldInclude, relBase, onProgress) {
  const include = shouldInclude || (() => true);
  const base = relBase || '';
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const relPath = base ? base + '/' + entry.name : entry.name;

    if (!include(relPath)) continue;

    const isHbs = entry.name.endsWith('.hbs');
    let renderedName;
    try {
      renderedName = renderString(isHbs ? entry.name.slice(0, -4) : entry.name, ctx);
    } catch (err) {
      throw new TemplateRenderError(
        `Failed to render filename "${entry.name}": ${err.message}`,
        { templatePath: srcPath }
      );
    }
    const destPath = path.join(destDir, renderedName);

    if (entry.isDirectory()) {
      await fs.ensureDir(destPath);
      await renderTemplateDir(srcPath, destPath, ctx, include, relPath, onProgress);
    } else {
      if (onProgress) {
        var displayPath = destPath.split('/').slice(-4).join('/');
        onProgress(displayPath);
      }
      if (isHbs) {
        const content = await fs.readFile(srcPath, 'utf8');
        let rendered;
        try {
          rendered = renderString(content, ctx);
        } catch (err) {
          throw new TemplateRenderError(err.message, {
            templatePath: srcPath,
            line: err.lineNumber || null,
          });
        }
        await fs.ensureDir(path.dirname(destPath));
        await fs.writeFile(destPath, rendered, 'utf8');
      } else {
        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(srcPath, destPath);
      }
    }
  }
}

async function renderModuleFiles(srcDir, destDir, ctx, moduleNames, shouldInclude, onProgress) {
  for (const moduleName of moduleNames) {
    await renderTemplateDir(
      srcDir,
      destDir,
      Object.assign({}, ctx, { moduleName }),
      shouldInclude,
      null,
      onProgress
    );
  }
}

module.exports = { renderTemplateDir, renderModuleFiles, renderString, compileTemplate, countFilesInTemplateDir };
