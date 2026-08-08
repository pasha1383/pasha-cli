'use strict';

const {
  PLATFORM,
  SUPPORTED_PLATFORMS,
  commandExists,
  resolveCommandPath,
  checkTool,
  checkAll,
} = require('../../lib/core/prerequisites');

describe('prerequisites', () => {
  describe('PLATFORM', () => {
    it('is defined', () => {
      expect(PLATFORM).toBeDefined();
    });

    it('is a string', () => {
      expect(typeof PLATFORM).toBe('string');
    });
  });

  describe('SUPPORTED_PLATFORMS', () => {
    it('includes linux', () => {
      expect(SUPPORTED_PLATFORMS).toContain('linux');
    });

    it('includes darwin', () => {
      expect(SUPPORTED_PLATFORMS).toContain('darwin');
    });
  });

  describe('commandExists', () => {
    it('returns true for node', () => {
      expect(commandExists('node')).toBe(true);
    });

    it('returns false for nonexistent command', () => {
      expect(commandExists('nonexistent_tool_xyz_123')).toBe(false);
    });
  });

  describe('resolveCommandPath', () => {
    it('returns a string for node', () => {
      const path = resolveCommandPath('node');
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });

    it('returns null for nonexistent command', () => {
      expect(resolveCommandPath('nonexistent_tool_xyz_123')).toBe(null);
    });
  });

  describe('checkTool', () => {
    it('returns object with tool and installed for node', () => {
      const result = checkTool('node');
      expect(result).toHaveProperty('tool', 'node');
      expect(result).toHaveProperty('installed');
      expect(result.installed).toBe(true);
    });

    it('returns installed false for unknown tool', () => {
      const result = checkTool('nonexistent_tool_xyz_123');
      expect(result.tool).toBe('nonexistent_tool_xyz_123');
      expect(result.installed).toBe(false);
    });
  });

  describe('checkAll', () => {
    it('returns an array', () => {
      const results = checkAll(['node', 'git']);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
    });

    it('each entry has tool and installed properties', () => {
      const results = checkAll(['node']);
      expect(results[0]).toHaveProperty('tool');
      expect(results[0]).toHaveProperty('installed');
    });
  });
});
