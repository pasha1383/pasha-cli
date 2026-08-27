'use strict';
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');
require('./helpers');
const { makeIncludeCheck } = require('./conditions');
const { TemplateRenderError } = require('./errors');

const compileCache = new Map();

// Handlebars' compiled template is lazily parsed on first invocation (see
// its own compiler.js: "Template is only compiled on first use") — so
// Handlebars.compile() below essentially never throws synchronously; the
// actual parse error surfaces later, when the returned function is called
// with a context (i.e. inside renderString). That error's shape varies:
//   - a semantic AST error (e.g. mismatched {{#if}}/{{/unless}}) is a
//     Handlebars.Exception and carries the line under `.lineNumber`
//   - a raw syntax error from the underlying parser (e.g. the classic
//     `${...{{expr}}}` brace collision — AGENT.md gotcha #1) carries no
//     `.lineNumber` at all, only "Parse error on line N:" in the message
//   - a TemplateRenderError we already threw and are re-wrapping carries
//     the line under `.line`, per errors.js — never `.lineNumber`
// extractLine checks all three so the line survives regardless of which
// shape actually reached the catch block.
function extractLine(err) {
  if (!err) return null;
  if (typeof err.line === 'number') return err.line;
  if (typeof err.lineNumber === 'number') return err.lineNumber;
  const match = /line (\d+)/.exec(err.message || '');
  return match ? Number(match[1]) : null;
}

function compileTemplate(src) {
  if (compileCache.has(src)) return compileCache.get(src);
  try {
    const tpl = Handlebars.compile(src, { noEscape: true });
    compileCache.set(src, tpl);
    return tpl;
  } catch (err) {
    throw new TemplateRenderError(err.message, { templatePath: null, line: extractLine(err) });
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
        { templatePath: srcPath, line: extractLine(err) }
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
            line: extractLine(err),
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
