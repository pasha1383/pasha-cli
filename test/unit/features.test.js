'use strict';

const { resolveFeatures, REGISTRY } = require('../../src/core/features');
const nestjsFeatures = require('../../src/core/features/nestjs');
const expressFeatures = require('../../src/core/features/express');

describe('features/index — resolveFeatures dispatcher', () => {
  it('resolves a known flavor to its module', () => {
    expect(resolveFeatures('nestjs')).toBe(nestjsFeatures);
    expect(resolveFeatures('express')).toBe(expressFeatures);
  });

  it('throws for an unknown flavor', () => {
    expect(() => resolveFeatures('does-not-exist')).toThrow(/Unknown stack flavor/);
  });

  it('every registered module exposes the full required interface', () => {
    const required = [
      'ormChoices',
      'databaseChoices',
      'validationChoices',
      'brokerChoices',
      'extraFeatureChoices',
      'deriveFlags',
      'resolveDependencies',
      'resolveScripts',
    ];
    for (const mod of Object.values(REGISTRY)) {
      for (const key of required) {
        expect(typeof mod[key]).toBe('function');
      }
    }
  });
});

describe('features/nestjs', () => {
  const { deriveFlags, resolveDependencies, resolveScripts, databaseChoices, ormChoices } = nestjsFeatures;

  describe('deriveFlags', () => {
    it('prisma + postgres sets ormPrisma=true and dbPostgres=true', () => {
      const flags = deriveFlags({ orm: 'prisma', database: 'postgres' });
      expect(flags.ormPrisma).toBe(true);
      expect(flags.dbPostgres).toBe(true);
      expect(flags.hasOrm).toBe(true);
    });

    it('mongoose + mongo sets ormMongoose=true and hasOrmClassEntity=true', () => {
      const flags = deriveFlags({ orm: 'mongoose', database: 'mongo' });
      expect(flags.ormMongoose).toBe(true);
      expect(flags.hasOrmClassEntity).toBe(true);
      expect(flags.dbMongo).toBe(true);
    });

    it('no orm sets ormNone=true and hasOrm=false', () => {
      const flags = deriveFlags({ orm: 'none' });
      expect(flags.ormNone).toBe(true);
      expect(flags.hasOrm).toBe(false);
    });

    it('extras array converts to boolean flags', () => {
      const flags = deriveFlags({ extras: ['swagger', 'lint', 'tests'] });
      expect(flags.useSwagger).toBe(true);
      expect(flags.useLint).toBe(true);
      expect(flags.useTests).toBe(true);
      expect(flags.useCI).toBe(false);
      expect(flags.useAuth).toBe(false);
    });

    it('extras empty uses defaults (false)', () => {
      const flags = deriveFlags({ extras: [] });
      expect(flags.useSwagger).toBe(false);
      expect(flags.useLint).toBe(false);
      expect(flags.useTests).toBe(false);
    });

    it('decorateDtoForSwagger when swagger + class-validator', () => {
      const flags = deriveFlags({ orm: 'prisma', validation: 'class-validator', extras: ['swagger'] });
      expect(flags.decorateDtoForSwagger).toBe(true);
    });

    it('dbNeedsServer false for sqlite', () => {
      expect(deriveFlags({ database: 'sqlite' }).dbNeedsServer).toBe(false);
    });

    it('dbNeedsServer true for postgres', () => {
      expect(deriveFlags({ database: 'postgres' }).dbNeedsServer).toBe(true);
    });

    it('dbPort set correctly', () => {
      expect(deriveFlags({ database: 'postgres' }).dbPort).toBe(5432);
      expect(deriveFlags({ database: 'mysql' }).dbPort).toBe(3306);
      expect(deriveFlags({ database: 'mongo' }).dbPort).toBe(27017);
      expect(deriveFlags({ database: 'sqlite' }).dbPort).toBe(null);
    });

    it('hasSharedInfra true when orm selected', () => {
      expect(deriveFlags({ orm: 'prisma' }).hasSharedInfra).toBe(true);
    });

    it('hasSharedInfra false with no selections', () => {
      expect(deriveFlags({ orm: 'none' }).hasSharedInfra).toBe(false);
    });

    it('needsCoreTokens true with rateLimit', () => {
      expect(deriveFlags({ extras: ['rateLimit'] }).needsCoreTokens).toBe(true);
    });

    it('useDocker true when dbNeedsServer', () => {
      expect(deriveFlags({ database: 'postgres' }).useDocker).toBe(true);
    });
  });

  describe('resolveDependencies', () => {
    it('always includes @nestjs/common and @nestjs/core', () => {
      const { dependencies } = resolveDependencies(deriveFlags({}));
      expect(dependencies['@nestjs/common']).toBe('^10.0.0');
      expect(dependencies['@nestjs/core']).toBe('^10.0.0');
    });

    it('prisma adds @prisma/client and prisma devDep', () => {
      const { dependencies, devDependencies } = resolveDependencies(deriveFlags({ orm: 'prisma' }));
      expect(dependencies['@prisma/client']).toBe('^5.14.0');
      expect(devDependencies.prisma).toBe('^5.14.0');
    });

    it('redis adds ioredis, no redis adds nothing', () => {
      expect(resolveDependencies(deriveFlags({ useRedis: true })).dependencies.ioredis).toBe('^5.4.1');
      expect(resolveDependencies(deriveFlags({})).dependencies.ioredis).toBeUndefined();
    });

    it('typeorm + postgres adds pg', () => {
      const { dependencies } = resolveDependencies(deriveFlags({ orm: 'typeorm', database: 'postgres' }));
      expect(dependencies.pg).toBe('^8.11.5');
    });

    it('mongoose adds @nestjs/mongoose and mongoose', () => {
      const { dependencies } = resolveDependencies(deriveFlags({ orm: 'mongoose' }));
      expect(dependencies['@nestjs/mongoose']).toBe('^10.0.6');
      expect(dependencies.mongoose).toBe('^8.4.0');
    });

    it('swagger adds @nestjs/swagger', () => {
      expect(resolveDependencies(deriveFlags({ extras: ['swagger'] })).dependencies['@nestjs/swagger']).toBe('^7.4.0');
    });
  });

  describe('databaseChoices', () => {
    it('prisma returns 4 options', () => {
      expect(databaseChoices('prisma')).toHaveLength(4);
    });

    it('mongoose returns only mongo', () => {
      const choices = databaseChoices('mongoose');
      expect(choices).toHaveLength(1);
      expect(choices[0].value).toBe('mongo');
    });

    it('none / unknown orm returns empty array', () => {
      expect(databaseChoices('none')).toEqual([]);
      expect(databaseChoices('unknown')).toEqual([]);
    });
  });

  describe('ormChoices', () => {
    it('returns 4 options including prisma, typeorm, mongoose, none', () => {
      const choices = ormChoices();
      expect(choices).toHaveLength(4);
      const values = choices.map((c) => c.value);
      expect(values).toEqual(expect.arrayContaining(['prisma', 'typeorm', 'mongoose', 'none']));
    });
  });

  describe('resolveScripts', () => {
    it('always includes build and start scripts', () => {
      const scripts = resolveScripts(deriveFlags({}));
      expect(scripts.build).toBe('nest build');
      expect(scripts.start).toBe('nest start');
    });

    it('prisma adds prisma scripts', () => {
      const scripts = resolveScripts(deriveFlags({ orm: 'prisma' }));
      expect(scripts['prisma:generate']).toBe('prisma generate');
      expect(scripts['prisma:migrate']).toBe('prisma migrate dev');
      expect(scripts['prisma:studio']).toBe('prisma studio');
    });

    it('no prisma == no prisma scripts', () => {
      expect(resolveScripts(deriveFlags({}))['prisma:migrate']).toBeUndefined();
    });

    it('lint adds lint and format scripts', () => {
      const scripts = resolveScripts(deriveFlags({ extras: ['lint'] }));
      expect(scripts.lint).toContain('eslint');
      expect(scripts.format).toContain('prettier');
    });

    it('tests adds test scripts', () => {
      const scripts = resolveScripts(deriveFlags({ extras: ['tests'] }));
      expect(scripts.test).toBe('jest');
      expect(scripts['test:watch']).toBe('jest --watch');
      expect(scripts['test:cov']).toBe('jest --coverage');
      expect(scripts['test:e2e']).toContain('jest-e2e');
    });

    it('useDocker adds infra scripts', () => {
      const scripts = resolveScripts(deriveFlags({ database: 'postgres' }));
      expect(scripts['infra:up']).toContain('docker compose');
      expect(scripts['infra:down']).toContain('docker compose');
    });
  });
});

describe('features/express', () => {
  const { deriveFlags, resolveDependencies, resolveScripts, databaseChoices, ormChoices } = expressFeatures;

  it('deriveFlags mirrors the nestjs shape but has no DI-only concepts', () => {
    const flags = deriveFlags({ orm: 'prisma', database: 'postgres', validation: 'express-validator' });
    expect(flags.ormPrisma).toBe(true);
    expect(flags.dbPostgres).toBe(true);
    expect(flags.useExpressValidator).toBe(true);
    expect(flags.hasOrm).toBe(true);
  });

  it('deriveFlags supports zod validation and reports hasValidation', () => {
    const flags = deriveFlags({ validation: 'zod' });
    expect(flags.useZod).toBe(true);
    expect(flags.hasValidation).toBe(true);
  });

  it('resolveDependencies always includes the express runtime deps', () => {
    const { dependencies } = resolveDependencies(deriveFlags({}));
    expect(dependencies.express).toBe('^4.19.2');
    expect(dependencies.cors).toBe('^2.8.5');
    expect(dependencies.helmet).toBe('^7.1.0');
  });

  it('resolveDependencies adds express-validator only when selected', () => {
    expect(resolveDependencies(deriveFlags({ validation: 'express-validator' })).dependencies['express-validator']).toBe(
      '^7.1.0'
    );
    expect(resolveDependencies(deriveFlags({})).dependencies['express-validator']).toBeUndefined();
  });

  it('resolveScripts uses tsc/node instead of nest build/start', () => {
    const scripts = resolveScripts(deriveFlags({}));
    expect(scripts.build).toBe('tsc');
    expect(scripts.start).toBe('node dist/main.js');
  });

  it('databaseChoices/ormChoices behave the same as nestjs', () => {
    expect(ormChoices()).toHaveLength(4);
    expect(databaseChoices('mongoose')).toHaveLength(1);
  });
});
