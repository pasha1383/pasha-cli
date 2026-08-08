'use strict';

const { getLanguages, getFrameworks, getArchitectures, getTemplateDir } = require('../../lib/core/manifest');

const mock = {
  languages: {
    node: {
      label: 'Node',
      frameworks: {
        nestjs: {
          label: 'NestJS',
          architectures: {
            layered: { label: 'Layered', template: 'nnl' },
            hexagonal: { label: 'Hexagonal', template: 'nnh' },
          },
        },
        express: {
          label: 'Express',
          architectures: {
            layered: { label: 'Layered', template: 'nel' },
          },
        },
      },
    },
    python: {
      label: 'Python',
      frameworks: {
        fastapi: {
          label: 'FastAPI',
          architectures: {
            layered: { label: 'Layered', template: 'pfl' },
          },
        },
      },
    },
  },
};

describe('manifest', () => {
  describe('getLanguages', () => {
    it('returns language choices with name and value', () => {
      const languages = getLanguages(mock);
      expect(languages).toHaveLength(2);
      expect(languages[0]).toEqual({ name: 'Node', value: 'node' });
      expect(languages[1]).toEqual({ name: 'Python', value: 'python' });
    });
  });

  describe('getFrameworks', () => {
    it('returns framework choices for a language', () => {
      const frameworks = getFrameworks(mock, 'node');
      expect(frameworks).toHaveLength(2);
      expect(frameworks[0]).toEqual({ name: 'NestJS', value: 'nestjs' });
      expect(frameworks[1]).toEqual({ name: 'Express', value: 'express' });
    });

    it('returns empty array for unknown language', () => {
      expect(() => getFrameworks(mock, 'unknown')).toThrow();
    });
  });

  describe('getArchitectures', () => {
    it('returns architecture choices for a framework', () => {
      const archs = getArchitectures(mock, 'node', 'nestjs');
      expect(archs).toHaveLength(2);
      expect(archs[0]).toEqual({ name: 'Layered', value: 'layered' });
      expect(archs[1]).toEqual({ name: 'Hexagonal', value: 'hexagonal' });
    });

    it('returns single architecture for express', () => {
      const archs = getArchitectures(mock, 'node', 'express');
      expect(archs).toHaveLength(1);
      expect(archs[0].value).toBe('layered');
    });

    it('throws for unknown framework', () => {
      expect(() => getArchitectures(mock, 'node', 'unknown')).toThrow();
    });
  });

  describe('getTemplateDir', () => {
    it('returns template directory identifier', () => {
      expect(getTemplateDir(mock, 'node', 'nestjs', 'layered')).toBe('nnl');
      expect(getTemplateDir(mock, 'node', 'nestjs', 'hexagonal')).toBe('nnh');
      expect(getTemplateDir(mock, 'node', 'express', 'layered')).toBe('nel');
    });
  });
});
