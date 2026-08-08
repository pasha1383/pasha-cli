'use strict';

const {
  deriveFlags,
  resolveDependencies,
  resolveScripts,
  databaseChoices,
  ormChoices,
} = require('../../lib/core/features');

describe('features', () => {
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
      const flags = deriveFlags({ database: 'sqlite' });
      expect(flags.dbNeedsServer).toBe(false);
    });

    it('dbNeedsServer true for postgres', () => {
      const flags = deriveFlags({ database: 'postgres' });
      expect(flags.dbNeedsServer).toBe(true);
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
      const flags = deriveFlags({ orm: 'none' });
      expect(flags.hasSharedInfra).toBe(false);
    });

    it('needsCoreTokens true with rateLimit', () => {
      expect(deriveFlags({ extras: ['rateLimit'] }).needsCoreTokens).toBe(true);
    });

    it('useDocker true when dbNeedsServer', () => {
      expect(deriveFlags({ database: 'postgres' }).useDocker).toBe(true);
    });
  });

  describe('resolveDependencies', () => {
    it('always includes @nestjs/common', () => {
      const { dependencies } = resolveDependencies(deriveFlags({}));
      expect(dependencies['@nestjs/common']).toBe('^10.0.0');
    });

    it('always includes @nestjs/core', () => {
      const { dependencies } = resolveDependencies(deriveFlags({}));
      expect(dependencies['@nestjs/core']).toBe('^10.0.0');
    });

    it('prisma adds @prisma/client and prisma devDep', () => {
      const { dependencies, devDependencies } = resolveDependencies(deriveFlags({ orm: 'prisma' }));
      expect(dependencies['@prisma/client']).toBe('^5.14.0');
      expect(devDependencies.prisma).toBe('^5.14.0');
    });

    it('redis adds ioredis', () => {
      const { dependencies } = resolveDependencies(deriveFlags({ useRedis: true }));
      expect(dependencies.ioredis).toBe('^5.4.1');
    });

    it('no redis == no ioredis', () => {
      const { dependencies } = resolveDependencies(deriveFlags({}));
      expect(dependencies.ioredis).toBeUndefined();
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
      const { dependencies } = resolveDependencies(deriveFlags({ extras: ['swagger'] }));
      expect(dependencies['@nestjs/swagger']).toBe('^7.4.0');
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

    it('none returns empty array', () => {
      expect(databaseChoices('none')).toEqual([]);
    });

    it('unknown orm returns empty array', () => {
      expect(databaseChoices('unknown')).toEqual([]);
    });
  });

  describe('ormChoices', () => {
    it('returns 4 options', () => {
      expect(ormChoices()).toHaveLength(4);
    });

    it('includes prisma, typeorm, mongoose, none', () => {
      const values = ormChoices().map((c) => c.value);
      expect(values).toContain('prisma');
      expect(values).toContain('typeorm');
      expect(values).toContain('mongoose');
      expect(values).toContain('none');
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

    it('no prisma == no prisma scripts', () => {
      const scripts = resolveScripts(deriveFlags({}));
      expect(scripts['prisma:migrate']).toBeUndefined();
    });

    it('useDocker adds infra scripts', () => {
      const scripts = resolveScripts(deriveFlags({ database: 'postgres' }));
      expect(scripts['infra:up']).toContain('docker compose');
      expect(scripts['infra:down']).toContain('docker compose');
    });
  });
});
