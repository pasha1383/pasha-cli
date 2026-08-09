'use strict';

const { ORM_DATABASE_SUPPORT, DATABASE_LABELS, DEFAULT_PORTS } = require('./shared');

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

function brokerChoices() {
  return [
    { name: 'None', value: 'none' },
    { name: 'Kafka', value: 'kafka' },
    { name: 'RabbitMQ', value: 'rabbitmq' },
  ];
}

function validationChoices() {
  return [
    { name: 'Zod (recommended — Fastify native JSON Schema compat)', value: 'zod' },
    { name: 'None (Fastify built-in JSON Schema)', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'Swagger / OpenAPI docs (@fastify/swagger)', value: 'swagger', checked: true },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Jest test scaffold (unit + e2e)', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test, build)', value: 'ci', checked: false },
    { name: 'JWT authentication (@fastify/jwt)', value: 'auth', checked: false },
    { name: 'Health check endpoint', value: 'health', checked: true },
    { name: 'Dockerfile for the app itself', value: 'dockerfile', checked: false },
    { name: 'Rate limiting (@fastify/rate-limit)', value: 'rateLimit', checked: false },
  ];
}

function deriveFlags(answers) {
  const orm = answers.orm || 'none';
  const database = answers.database || 'none';
  const validation = answers.validation || 'none';
  const broker = answers.broker || 'none';

  const flags = {
    orm,
    database,
    validation,
    broker,

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
    hasValidation: validation !== 'none',

    useRedis: Boolean(answers.useRedis),

    useKafka: broker === 'kafka',
    useRabbitmq: broker === 'rabbitmq',
    hasBroker: broker !== 'none',

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

  flags.useDocker = flags.dbNeedsServer || flags.useRedis || flags.hasBroker;
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.hasBroker || flags.useAuth || flags.useHealthCheck;

  return flags;
}

function resolveDependencies(flags) {
  const dependencies = {
    fastify: '^4.28.1',
    '@fastify/cors': '^9.0.1',
    '@fastify/helmet': '^11.1.1',
    dotenv: '^16.4.5',
  };

  const devDependencies = {
    typescript: '^5.4.0',
    tsx: '^4.11.0',
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

  if (flags.useRedis) {
    dependencies.ioredis = '^5.4.1';
  }

  if (flags.useKafka) {
    dependencies.kafkajs = '^2.2.4';
  }

  if (flags.useRabbitmq) {
    dependencies.amqplib = '^0.10.4';
    devDependencies['@types/amqplib'] = '^0.10.5';
  }

  if (flags.useSwagger) {
    dependencies['@fastify/swagger'] = '^8.15.0';
    dependencies['@fastify/swagger-ui'] = '^4.1.0';
  }

  if (flags.useAuth) {
    dependencies['@fastify/jwt'] = '^8.0.1';
  }

  if (flags.useRateLimit) {
    dependencies['@fastify/rate-limit'] = '^9.1.0';
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
  ORM_DATABASE_SUPPORT,
  DATABASE_LABELS,
  ormChoices,
  databaseChoices,
  brokerChoices,
  validationChoices,
  extraFeatureChoices,
  deriveFlags,
  resolveDependencies,
  resolveScripts,
  resolveJestConfig,
};
