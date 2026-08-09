'use strict';

const { ORM_DATABASE_SUPPORT, DATABASE_LABELS, DEFAULT_PORTS } = require('./shared');

/**
 * Koa-specific stack feature resolution. Koa is like Express but async
 * middleware via async/await — no `next()` callbacks, no `res.send()`.
 * Everything goes through `ctx.body` and `ctx.status`.
 */

function ormChoices(_framework) {
  return [
    { name: 'Prisma', value: 'prisma' },
    { name: 'TypeORM', value: 'typeorm' },
    { name: 'Mongoose (MongoDB only)', value: 'mongoose' },
    { name: 'None — in-memory repository', value: 'none' },
  ];
}

function databaseChoices(orm) {
  return (ORM_DATABASE_SUPPORT[orm] || []).map((value) => ({
    name: DATABASE_LABELS[value],
    value,
  }));
}

function validationChoices() {
  return [
    { name: 'Zod', value: 'zod' },
    { name: 'class-validator', value: 'class-validator' },
    { name: 'None', value: 'none' },
  ];
}

function brokerChoices() {
  return [{ name: 'None', value: 'none' }];
}

function extraFeatureChoices() {
  return [
    { name: 'Swagger / OpenAPI docs', value: 'swagger', checked: true },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Jest test scaffold (unit + e2e)', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test, build)', value: 'ci', checked: false },
    { name: 'JWT authentication (koa-jwt)', value: 'auth', checked: false },
    { name: 'Health check endpoint', value: 'health', checked: true },
    { name: 'Dockerfile for the app itself', value: 'dockerfile', checked: false },
    { name: 'Rate limiting (koa2-ratelimit)', value: 'rateLimit', checked: false },
  ];
}

function deriveFlags(answers) {
  const orm = answers.orm || 'none';
  const database = answers.database || 'none';
  const validation = answers.validation || 'none';

  const flags = {
    orm,
    database,
    validation,

    ormPrisma: orm === 'prisma',
    ormTypeorm: orm === 'typeorm',
    ormMongoose: orm === 'mongoose',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbMongo: database === 'mongo',
    dbSqlite: database === 'sqlite',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql', 'mongo'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useZod: validation === 'zod',
    useClassValidator: validation === 'class-validator',
    hasValidation: validation !== 'none',

    useRedis: Boolean(answers.useRedis),

    hasBroker: false,

    useAgentDocs: answers.useAgentDocs !== false,
  };

  const extras = new Set(answers.extras || []);
  flags.useSwagger = extras.has('swagger');
  flags.useLint = extras.has('lint');
  flags.useTests = extras.has('tests');
  flags.useCI = extras.has('ci');
  flags.useAuth = extras.has('auth');
  flags.useHealthCheck = extras.has('health');
  flags.useAppDockerfile = extras.has('dockerfile');
  flags.useRateLimit = extras.has('rateLimit');

  flags.healthChecksDb = flags.useHealthCheck && flags.hasOrm;
  flags.healthChecksRedis = flags.useHealthCheck && flags.useRedis;

  flags.hasOrmClassEntity = flags.ormTypeorm || flags.ormMongoose;

  flags.useDocker = flags.dbNeedsServer || flags.useRedis;
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.useAuth || flags.useHealthCheck;

  return flags;
}

function resolveDependencies(flags) {
  const dependencies = {
    koa: '^2.15.0',
    '@koa/cors': '^5.0.0',
    'koa-helmet': '^8.0.0',
    'koa-bodyparser': '^4.4.0',
    '@koa/router': '^12.0.0',
    dotenv: '^16.4.5',
  };

  const devDependencies = {
    typescript: '^5.4.0',
    tsx: '^4.11.0',
    '@types/koa': '^2.15.0',
    '@types/koa__cors': '^5.0.0',
    '@types/koa-helmet': '^8.0.0',
    '@types/koa-bodyparser': '^4.3.0',
    '@types/koa__router': '^12.0.0',
    '@types/node': '^20.0.0',
  };

  if (flags.ormPrisma) {
    dependencies['@prisma/client'] = '^5.14.0';
    devDependencies.prisma = '^5.14.0';
  }

  if (flags.ormTypeorm) {
    dependencies.typeorm = '^0.3.20';
    dependencies['reflect-metadata'] = '^0.2.0';
    if (flags.dbPostgres) dependencies.pg = '^8.11.5';
    if (flags.dbMysql) dependencies.mysql2 = '^3.9.7';
    if (flags.dbSqlite) dependencies.sqlite3 = '^5.1.7';
    if (flags.dbMongo) dependencies.mongodb = '^5.9.2';
  }

  if (flags.ormMongoose) {
    dependencies.mongoose = '^8.4.0';
  }

  if (flags.useZod) {
    dependencies.zod = '^3.23.8';
  }

  if (flags.useClassValidator) {
    dependencies['class-validator'] = '^0.14.1';
    dependencies['class-transformer'] = '^0.5.1';
  }

  if (flags.useRedis) {
    dependencies.ioredis = '^5.4.1';
  }

  if (flags.useSwagger) {
    dependencies['swagger-jsdoc'] = '^6.2.8';
    dependencies['koa2-swagger-ui'] = '^2.1.0';
    devDependencies['@types/swagger-jsdoc'] = '^6.0.4';
  }

  if (flags.useAuth) {
    dependencies['koa-jwt'] = '^4.0.4';
    dependencies.jsonwebtoken = '^9.0.2';
    devDependencies['@types/jsonwebtoken'] = '^9.0.6';
  }

  if (flags.useRateLimit) {
    dependencies['koa2-ratelimit'] = '^1.1.2';
  }

  if (flags.useLint) {
    devDependencies.eslint = '^8.57.0';
    devDependencies['@typescript-eslint/eslint-plugin'] = '^7.7.1';
    devDependencies['@typescript-eslint/parser'] = '^7.7.1';
    devDependencies['eslint-config-prettier'] = '^9.1.0';
    devDependencies['eslint-plugin-prettier'] = '^5.1.3';
    devDependencies.prettier = '^3.2.5';
  }

  if (flags.useTests) {
    devDependencies.jest = '^29.7.0';
    devDependencies['@types/jest'] = '^29.5.12';
    devDependencies['ts-jest'] = '^29.1.2';
    devDependencies.supertest = '^7.0.0';
    devDependencies['@types/supertest'] = '^6.0.2';
  }

  return { dependencies, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    build: 'tsc',
    start: 'node dist/main.js',
    'start:dev': 'tsx watch src/main.ts',
  };

  if (flags.ormPrisma) {
    scripts['prisma:generate'] = 'prisma generate';
    scripts['prisma:migrate'] = 'prisma migrate dev';
    scripts['prisma:studio'] = 'prisma studio';
  }

  if (flags.useDocker) {
    scripts['infra:up'] = 'docker compose up -d';
    scripts['infra:down'] = 'docker compose down';
  }

  if (flags.useLint) {
    scripts.lint = 'eslint "{src,test}/**/*.ts" --fix';
    scripts.format = 'prettier --write "src/**/*.ts"';
  }

  if (flags.useTests) {
    scripts.test = 'jest';
    scripts['test:watch'] = 'jest --watch';
    scripts['test:cov'] = 'jest --coverage';
    scripts['test:e2e'] = 'jest --config jest.e2e.config.ts';
  }

  return scripts;
}

function resolveJestConfig() {
  return {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: { '^.+\\.(t|j)s$': 'ts-jest' },
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
  };
}

module.exports = {
  ormChoices,
  databaseChoices,
  validationChoices,
  brokerChoices,
  extraFeatureChoices,
  deriveFlags,
  resolveDependencies,
  resolveScripts,
  resolveJestConfig,
};
