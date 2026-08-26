'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const { renderString, renderTemplateDir, renderModuleFiles } = require('../../src/core/engine/renderer');
const { makeIncludeCheck } = require('../../src/core/engine/conditions');

describe('engine', () => {
  describe('renderString', () => {
    it('substitutes variables', () => {
      expect(renderString('Hello {{name}}', { name: 'World' })).toBe('Hello World');
    });

    it('pascalCase helper', () => {
      expect(renderString('{{pascalCase x}}', { x: 'product-variant' })).toBe('ProductVariant');
    });

    it('camelCase helper', () => {
      expect(renderString('{{camelCase x}}', { x: 'product-variant' })).toBe('productVariant');
    });

    it('constantCase helper', () => {
      expect(renderString('{{constantCase x}}', { x: 'product-variant' })).toBe('PRODUCT_VARIANT');
    });

    it('snakeCase helper', () => {
      expect(renderString('{{snakeCase x}}', { x: 'product-variant' })).toBe('product_variant');
    });

    it('eq helper true branch', () => {
      expect(renderString('{{#eq a "yes"}}Y{{else}}N{{/eq}}', { a: 'yes' })).toBe('Y');
    });

    it('eq helper false branch', () => {
      expect(renderString('{{#eq a "yes"}}Y{{else}}N{{/eq}}', { a: 'no' })).toBe('N');
    });

    it('shellDefault helper', () => {
      expect(renderString('{{shellDefault "DB" val}}', { val: 'myapp' })).toBe('${DB:-myapp}');
    });
  });

  describe('makeIncludeCheck', () => {
    const conds = { 'src/shared': 'hasShared', 'src/shared/health': 'hasHealth' };

    it('includes matching paths when flag is true', () => {
      const check = makeIncludeCheck(conds, { hasShared: true, hasHealth: true });
      expect(check('src/shared/database')).toBe(true);
    });

    it('excludes when flag is false', () => {
      const check = makeIncludeCheck(conds, { hasShared: false, hasHealth: true });
      expect(check('src/shared/database')).toBe(false);
    });

    it('includes non-matching paths', () => {
      const check = makeIncludeCheck(conds, { hasShared: false, hasHealth: true });
      expect(check('src/errors')).toBe(true);
    });

    it('excludes exact prefix match when flag is false', () => {
      const check = makeIncludeCheck(conds, { hasShared: false, hasHealth: true });
      expect(check('src/shared')).toBe(false);
    });

    it('handles trailing slashes in conditions', () => {
      const condsWithSlash = { 'src/shared/': 'hasShared' };
      const check = makeIncludeCheck(condsWithSlash, { hasShared: false });
      expect(check('src/shared/database')).toBe(false);
    });
  });

  describe('renderTemplateDir', () => {
    let srcDir;
    let destDir;

    beforeEach(async () => {
      const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pasha-engine-test-'));
      srcDir = path.join(base, 'src');
      destDir = path.join(base, 'dest');
      await fs.ensureDir(srcDir);
    });

    afterEach(async () => {
      await fs.remove(path.dirname(srcDir));
    });

    it('renders .hbs file content and strips the .hbs extension', async () => {
      await fs.writeFile(path.join(srcDir, 'README.md.hbs'), 'Project: {{projectName}}');
      await renderTemplateDir(srcDir, destDir, { projectName: 'demo' }, () => true);

      const rendered = await fs.readFile(path.join(destDir, 'README.md'), 'utf8');
      expect(rendered).toBe('Project: demo');
      expect(await fs.pathExists(path.join(destDir, 'README.md.hbs'))).toBe(false);
    });

    it('renders directory and file names', async () => {
      await fs.ensureDir(path.join(srcDir, '{{moduleName}}'));
      await fs.writeFile(path.join(srcDir, '{{moduleName}}', '{{moduleName}}.service.ts.hbs'), 'export class {{pascalCase moduleName}}Service {}');
      await renderTemplateDir(srcDir, destDir, { moduleName: 'product' }, () => true);

      const rendered = await fs.readFile(
        path.join(destDir, 'product', 'product.service.ts'),
        'utf8'
      );
      expect(rendered).toBe('export class ProductService {}');
    });

    it('copies non-.hbs files verbatim', async () => {
      await fs.writeFile(path.join(srcDir, 'logo.svg'), '<svg>{{not-a-template}}</svg>');
      await renderTemplateDir(srcDir, destDir, {}, () => true);

      const copied = await fs.readFile(path.join(destDir, 'logo.svg'), 'utf8');
      expect(copied).toBe('<svg>{{not-a-template}}</svg>');
    });

    it('skips files and directories rejected by shouldInclude', async () => {
      await fs.ensureDir(path.join(srcDir, 'gated'));
      await fs.writeFile(path.join(srcDir, 'gated', 'file.txt'), 'secret');
      await fs.writeFile(path.join(srcDir, 'ungated.txt'), 'public');

      const shouldInclude = (relPath) => relPath !== 'gated' && !relPath.startsWith('gated/');
      await renderTemplateDir(srcDir, destDir, {}, shouldInclude);

      expect(await fs.pathExists(path.join(destDir, 'gated'))).toBe(false);
      expect(await fs.pathExists(path.join(destDir, 'ungated.txt'))).toBe(true);
    });

    it('throws a TemplateRenderError with the srcPath when content fails to render', async () => {
      await fs.writeFile(path.join(srcDir, 'broken.ts.hbs'), '{{#if unterminated}}');
      await expect(renderTemplateDir(srcDir, destDir, {}, () => true)).rejects.toThrow();
    });
  });

  describe('renderModuleFiles', () => {
    let srcDir;
    let destDir;

    beforeEach(async () => {
      const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pasha-engine-modtest-'));
      srcDir = path.join(base, 'src');
      destDir = path.join(base, 'dest');
      await fs.ensureDir(srcDir);
    });

    afterEach(async () => {
      await fs.remove(path.dirname(srcDir));
    });

    it('renders once per module name with moduleName merged into context', async () => {
      await fs.writeFile(
        path.join(srcDir, '{{moduleName}}.controller.ts.hbs'),
        'export class {{pascalCase moduleName}}Controller {}'
      );

      await renderModuleFiles(srcDir, destDir, {}, ['product', 'order'], () => true);

      const productFile = await fs.readFile(path.join(destDir, 'product.controller.ts'), 'utf8');
      const orderFile = await fs.readFile(path.join(destDir, 'order.controller.ts'), 'utf8');
      expect(productFile).toBe('export class ProductController {}');
      expect(orderFile).toBe('export class OrderController {}');
    });

    it('does not mutate the base context between modules', async () => {
      await fs.writeFile(path.join(srcDir, 'file.txt.hbs'), '{{moduleName}}');
      const baseCtx = { projectName: 'demo' };

      await renderModuleFiles(srcDir, destDir, baseCtx, ['a'], () => true);

      expect(baseCtx.moduleName).toBeUndefined();
    });
  });
});
