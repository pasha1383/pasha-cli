'use strict';

jest.mock('fs-extra');

const { sessionToAnswers } = require('../../lib/core/history');

describe('history', () => {
  describe('sessionToAnswers', () => {
    it('returns empty object for null session', () => {
      expect(sessionToAnswers(null)).toEqual({});
    });

    it('returns empty object for session without answers', () => {
      expect(sessionToAnswers({})).toEqual({});
    });

    it('converts session to answers object', () => {
      const session = {
        timestamp: '2024-01-01T00:00:00.000Z',
        projectName: 'my-app',
        language: 'node',
        framework: 'nestjs',
        architecture: 'layered',
        answers: {
          projectName: 'my-app',
          author: 'Test Author',
          github: 'testuser',
          description: 'A test project',
          orm: 'prisma',
          database: 'postgres',
          validation: 'zod',
          useRedis: true,
          broker: 'kafka',
          useAgentDocs: false,
          extras: ['swagger', 'lint'],
          modules: ['users', 'products'],
          architectureLabel: 'Layered',
        },
      };

      const result = sessionToAnswers(session);
      expect(result.projectName).toBe('my-app');
      expect(result.language).toBe('node');
      expect(result.framework).toBe('nestjs');
      expect(result.architecture).toBe('layered');
      expect(result.author).toBe('Test Author');
      expect(result.orm).toBe('prisma');
      expect(result.database).toBe('postgres');
      expect(result.useRedis).toBe(true);
      expect(result.extras).toEqual(['swagger', 'lint']);
      expect(result.modules).toEqual(['users', 'products']);
    });

    it('prioritizes top-level projectName over answers.projectName', () => {
      const session = {
        projectName: 'top-level-name',
        answers: {
          projectName: 'nested-name',
        },
      };

      const result = sessionToAnswers(session);
      expect(result.projectName).toBe('top-level-name');
    });

    it('falls back to answers.projectName if top-level is missing', () => {
      const session = {
        answers: {
          projectName: 'nested-name',
        },
      };

      const result = sessionToAnswers(session);
      expect(result.projectName).toBe('nested-name');
    });
  });
});
