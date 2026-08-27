'use strict';

const { compareVersions } = require('../../src/cli/commands/update');

describe('update', () => {
  describe('compareVersions', () => {
    it('returns 0 for equal versions', () => {
      expect(compareVersions('3.0.0', '3.0.0')).toBe(0);
    });

    it('returns negative when a < b (patch)', () => {
      expect(compareVersions('3.0.0', '3.0.1')).toBeLessThan(0);
    });

    it('returns positive when a > b (patch)', () => {
      expect(compareVersions('3.0.1', '3.0.0')).toBeGreaterThan(0);
    });

    it('returns negative when a < b (minor)', () => {
      expect(compareVersions('3.0.0', '3.1.0')).toBeLessThan(0);
    });

    it('returns positive when a > b (minor)', () => {
      expect(compareVersions('3.1.0', '3.0.9')).toBeGreaterThan(0);
    });

    it('returns negative when a < b (major)', () => {
      expect(compareVersions('2.9.9', '3.0.0')).toBeLessThan(0);
    });

    it('treats missing segments as 0', () => {
      expect(compareVersions('3.0', '3.0.0')).toBe(0);
      expect(compareVersions('3', '3.0.1')).toBeLessThan(0);
    });
  });

  describe('update()', () => {
    let log;
    let runMock;
    let httpsGetMock;

    function makeFakeResponse({ statusCode = 200, body = '{}' } = {}) {
      const listeners = {};
      const res = {
        statusCode,
        setEncoding: jest.fn(),
        on: (event, cb) => {
          listeners[event] = cb;
          return res;
        },
        resume: jest.fn(),
      };
      // simulate async data/end emission
      process.nextTick(() => {
        if (listeners.data) listeners.data(body);
        if (listeners.end) listeners.end();
      });
      return res;
    }

    beforeEach(() => {
      jest.resetModules();

      jest.doMock('../../src/utils/logger', () => ({
        ok: jest.fn(),
        fail: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        title: jest.fn(),
      }));

      runMock = jest.fn().mockResolvedValue(undefined);
      jest.doMock('../../src/core/system/exec', () => ({ run: runMock }));

      log = require('../../src/utils/logger');
    });

    afterEach(() => {
      jest.dontMock('https');
      jest.resetModules();
    });

    it('reports up to date when current >= latest', async () => {
      jest.doMock('https', () => ({
        get: (url, opts, cb) => {
          const res = makeFakeResponse({ body: JSON.stringify({ version: '0.0.1' }) });
          cb(res);
          return { on: jest.fn(), destroy: jest.fn() };
        },
      }));

      const { update } = require('../../src/cli/commands/update');
      log = require('../../src/utils/logger');

      await update({ check: true });

      expect(log.ok).toHaveBeenCalledWith(expect.stringContaining('latest version'));
      expect(runMock).not.toHaveBeenCalled();
    });

    it('reports an available update without installing when --check is passed', async () => {
      jest.doMock('https', () => ({
        get: (url, opts, cb) => {
          const res = makeFakeResponse({ body: JSON.stringify({ version: '999.0.0' }) });
          cb(res);
          return { on: jest.fn(), destroy: jest.fn() };
        },
      }));

      const { update } = require('../../src/cli/commands/update');
      log = require('../../src/utils/logger');

      await update({ check: true });

      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('new version is available'));
      expect(runMock).not.toHaveBeenCalled();
    });

    it('installs the update via the exec wrapper when available and --check is not passed', async () => {
      jest.doMock('https', () => ({
        get: (url, opts, cb) => {
          const res = makeFakeResponse({ body: JSON.stringify({ version: '999.0.0' }) });
          cb(res);
          return { on: jest.fn(), destroy: jest.fn() };
        },
      }));

      const { update, PACKAGE_NAME } = require('../../src/cli/commands/update');

      await update({});

      expect(runMock).toHaveBeenCalledWith('npm', ['install', '-g', `${PACKAGE_NAME}@latest`]);
    });
  });
});
