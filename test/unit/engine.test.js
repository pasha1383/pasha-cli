'use strict';

const { renderString, makeIncludeCheck } = require('../../lib/core/engine');

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
});
