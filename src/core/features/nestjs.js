'use strict';

/**
 * Stack feature selection for NestJS templates.
 *
 * Everything the user picks here fans out into three things:
 *   1. boolean flags on the render context  (drives {{#if}} in templates)
 *   2. file conditions                      (drives which files exist at all)
 *   3. npm dependencies                     (drives the generated package.json)
 *
 * Keeping the mapping in one place means adding a new option doesn't require
 * touching the engine or the wizard.
 */

// Which databases each data layer can actually talk to. Offering combinations
// that don't work would generate a project that can't boot.
const ORM_DATABASE_SUPPORT = {
  prisma: ['postgres', 'mysql', 'sqlite', 'mongo'],
  typeorm: ['postgres', 'mysql', 'sqlite', 'mongo'],
  mongoose: ['mongo'],
  none: [],
};

const DATABASE_LABELS = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  mongo: 'MongoDB',
  sqlite: 'SQLite (file-based, no server)',
};

const DEFAULT_PORTS = {
  postgres: 5432,
  mysql: 3306,
  mongo: 27017,
};

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
    { name: 'class-validator + class-transformer (NestJS standard)', value: 'class-validator' },
    { name: 'Zod', value: 'zod' },
    { name: 'None', value: 'none' },
  ];
}

function brokerChoices() {
  return [
    { name: 'None', value: 'none' },
    { name: 'Kafka', value: 'kafka' },
    { name: 'RabbitMQ', value: 'rabbitmq' },
  ];
}

// A single checkbox prompt covers all of these — each is an independent
// on/off toggle, so one multi-select is friendlier than eight yes/no prompts.
function extraFeatureChoices() {
  return [
    { name: 'Swagger / OpenAPI docs', value: 'swagger', checked: true },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Jest test scaffold (unit + e2e)', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test, build)', value: 'ci', checked: false },
    { name: 'JWT authentication (guard, decorator, interceptor)', value: 'auth', checked: false },
    { name: 'Health check endpoint (Terminus)', value: 'health', checked: true },
    { name: 'Dockerfile for the app itself', value: 'dockerfile', checked: false },
    { name: 'Rate limiting (throttler)', value: 'rateLimit', checked: false },
  ];
}

/**
 * Expands the raw answers into boolean flags the templates can branch on.
 * Templates stay readable ({{#if useRedis}}) instead of doing string
 * comparisons everywhere.
 */
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
    // SQLite is a file, so it never needs a docker service or host/port env vars
    dbNeedsServer: ['postgres', 'mysql', 'mongo'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useClassValidator: validation === 'class-validator',
    useZod: validation === 'zod',
    hasValidation: validation !== 'none',

    useRedis: Boolean(answers.useRedis),

    useKafka: broker === 'kafka',
    useRabbitmq: broker === 'rabbitmq',
    hasBroker: broker !== 'none',

    useAgentDocs: answers.useAgentDocs !== false,
  };

  // `extras` is the array of values from the checkbox prompt (e.g.
  // ['swagger', 'lint', 'auth']). Each becomes its own boolean flag.
  const extras = new Set(answers.extras || []);
  flags.useSwagger = extras.has('swagger');
  flags.useLint = extras.has('lint');
  flags.useTests = extras.has('tests');
  flags.useCI = extras.has('ci');
  flags.useAuth = extras.has('auth');
  flags.useHealthCheck = extras.has('health');
  flags.useAppDockerfile = extras.has('dockerfile');
  flags.useRateLimit = extras.has('rateLimit');

  // Swagger decorates DTO properties with @ApiProperty, which only makes
  // sense on an actual class — Zod DTOs are type aliases, not classes.
  flags.decorateDtoForSwagger = flags.useSwagger && flags.useClassValidator;

  // Health checks need something concrete to check beyond raw liveness.
  flags.healthChecksDb = flags.useHealthCheck && flags.hasOrm;
  flags.healthChecksRedis = flags.useHealthCheck && flags.useRedis;

  // A global guard needs @nestjs/core's APP_GUARD / APP_INTERCEPTOR tokens
  // registered somewhere — bundled here so app.module.ts knows to import them.
  flags.needsCoreTokens = flags.useRateLimit || flags.useAuth;

  // TypeORM and Mongoose decorate the entity class itself, so it has no
  // constructor and is built from an object literal instead.
  flags.hasOrmClassEntity = flags.ormTypeorm || flags.ormMongoose;

  // A compose file is only worth generating when something actually runs in it.
  flags.useDocker = flags.dbNeedsServer || flags.useRedis || flags.hasBroker;

  // src/shared/ only exists if some cross-cutting infrastructure was selected.
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.hasBroker || flags.useAuth || flags.useHealthCheck;

  return flags;
}

/**
 * Maps the derived flags to npm dependencies. Returned as plain objects so
 * the caller can serialize them straight into the generated package.json.
 */
function resolveDependencies(flags) {
  const dependencies = {
    '@nestjs/common': '^10.0.0',
    '@nestjs/core': '^10.0.0',
    '@nestjs/platform-express': '^10.0.0',
    '@nestjs/config': '^3.2.0',
    'reflect-metadata': '^0.2.0',
    rxjs: '^7.8.0',
  };

  const devDependencies = {
    '@nestjs/cli': '^10.0.0',
    '@types/express': '^4.17.0',
    '@types/node': '^20.0.0',
    typescript: '^5.4.0',
  };

  if (flags.ormPrisma) {
    dependencies['@prisma/client'] = '^5.14.0';
    devDependencies.prisma = '^5.14.0';
  }

  if (flags.ormTypeorm) {
    dependencies['@nestjs/typeorm'] = '^10.0.2';
    dependencies.typeorm = '^0.3.20';
    if (flags.dbPostgres) dependencies.pg = '^8.11.5';
    if (flags.dbMysql) dependencies.mysql2 = '^3.9.7';
    if (flags.dbSqlite) dependencies.sqlite3 = '^5.1.7';
    if (flags.dbMongo) dependencies.mongodb = '^5.9.2';
  }

  if (flags.ormMongoose) {
    dependencies['@nestjs/mongoose'] = '^10.0.6';
    dependencies.mongoose = '^8.4.0';
  }

  if (flags.useClassValidator) {
    dependencies['class-validator'] = '^0.14.1';
    dependencies['class-transformer'] = '^0.5.1';
  }

  if (flags.useZod) {
    dependencies.zod = '^3.23.8';
  }

  if (flags.useRedis) {
    dependencies.ioredis = '^5.4.1';
  }

  if (flags.useKafka) {
    dependencies['@nestjs/microservices'] = '^10.3.8';
    dependencies.kafkajs = '^2.2.4';
  }

  if (flags.useRabbitmq) {
    dependencies['@nestjs/microservices'] = '^10.3.8';
    dependencies.amqplib = '^0.10.4';
    dependencies['amqp-connection-manager'] = '^4.1.14';
  }

  if (flags.useSwagger) {
    dependencies['@nestjs/swagger'] = '^7.4.0';
  }

  if (flags.useAuth) {
    dependencies['@nestjs/jwt'] = '^10.2.0';
    dependencies['@nestjs/passport'] = '^10.0.3';
    dependencies.passport = '^0.7.0';
    dependencies['passport-jwt'] = '^4.0.1';
    devDependencies['@types/passport-jwt'] = '^4.0.1';
  }

  if (flags.useHealthCheck) {
    dependencies['@nestjs/terminus'] = '^10.2.3';
  }

  if (flags.useRateLimit) {
    dependencies['@nestjs/throttler'] = '^6.2.1';
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
    devDependencies['@nestjs/testing'] = '^10.0.0';
  }

  return { dependencies, devDependencies };
}

/**
 * Extra npm scripts that only make sense for certain selections.
 */
function resolveScripts(flags) {
  const scripts = {
    build: 'nest build',
    start: 'nest start',
    'start:dev': 'nest start --watch',
    'start:prod': 'node dist/main',
  };

  if (flags.ormPrisma) {
    scripts['prisma:generate'] = 'prisma generate';
    scripts['prisma:migrate'] = 'prisma migrate dev';
    scripts['prisma:studio'] = 'prisma studio';
  }

  if (flags.ormTypeorm) {
    scripts['typeorm'] = 'typeorm-ts-node-commonjs';
    scripts['migration:generate'] = 'npm run typeorm -- migration:generate -d src/shared/database/typeorm.datasource.ts';
    scripts['migration:run'] = 'npm run typeorm -- migration:run -d src/shared/database/typeorm.datasource.ts';
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
    scripts['test:e2e'] = 'jest --config ./test/jest-e2e.json';
  }

  return scripts;
}

/**
 * The unit-test jest config embedded directly in package.json (the NestJS
 * CLI default layout). e2e tests get their own config in test/jest-e2e.json
 * since they run against the compiled app with a different rootDir.
 */
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
  validationChoices,
  brokerChoices,
  extraFeatureChoices,
  deriveFlags,
  resolveDependencies,
  resolveScripts,
  resolveJestConfig,
};
