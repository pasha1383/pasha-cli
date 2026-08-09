'use strict';

const { ORM_DATABASE_SUPPORT, DATABASE_LABELS, DEFAULT_PORTS } = require('./shared');

/**
 * Serverless-specific stack feature resolution. Serverless runs handler-per-function
 * with no long-running server, no Express/Fastify, and no persistent consumers.
 *
 * Differences from Express:
 * - No broker (serverless functions don't run persistent consumers)
 * - Validation: Zod only (no express-validator — no Express)
 * - No rate limiting, no Swagger, no health-check endpoint (not applicable)
 * - Auth: raw JWT verification (no passport)
 * - No Express dependencies (express, cors, helmet, morgan)
 */

function ormChoices(_framework) {
  return [
    { name: 'Prisma', value: 'prisma' },
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
  ];
}

function validationChoices() {
  return [
    { name: 'Zod', value: 'zod' },
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Jest test scaffold (unit)', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test, build)', value: 'ci', checked: false },
    { name: 'JWT authentication (jsonwebtoken)', value: 'auth', checked: false },
    { name: 'Dockerfile for containerized Lambda', value: 'dockerfile', checked: false },
    { name: 'Serverless Framework (AWS)', value: 'serverless', checked: true },
    { name: 'Cloudflare Workers config', value: 'workers', checked: false },
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
    ormMongoose: orm === 'mongoose',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbMongo: database === 'mongo',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql', 'mongo'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useZod: validation === 'zod',
    hasValidation: validation !== 'none',

    useKafka: broker === 'kafka',
    useRabbitmq: broker === 'rabbitmq',
    hasBroker: broker !== 'none',

    useAgentDocs: answers.useAgentDocs !== false,
  };

  const extras = new Set(answers.extras || []);
  flags.useLint = extras.has('lint');
  flags.useTests = extras.has('tests');
  flags.useCI = extras.has('ci');
  flags.useAuth = extras.has('auth');
  flags.useAppDockerfile = extras.has('dockerfile');
  flags.useServerless = extras.has('serverless');
  flags.useWorkers = extras.has('workers');

  flags.useDocker = flags.dbNeedsServer;
  flags.hasSharedInfra = flags.hasOrm || flags.useAuth;

  return flags;
}

function resolveDependencies(flags) {
  const dependencies = {
    dotenv: '^16.4.5',
  };

  const devDependencies = {
    typescript: '^5.4.0',
    tsx: '^4.11.0',
    '@types/aws-lambda': '^8.10.138',
    '@types/node': '^20.0.0',
  };

  if (flags.ormPrisma) {
    dependencies['@prisma/client'] = '^5.14.0';
    devDependencies.prisma = '^5.14.0';
  }

  if (flags.ormMongoose) {
    dependencies.mongoose = '^8.4.0';
  }

  if (flags.useZod) {
    dependencies.zod = '^3.23.8';
  }

  if (flags.useAuth) {
    dependencies.jsonwebtoken = '^9.0.2';
    devDependencies['@types/jsonwebtoken'] = '^9.0.6';
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
    devDependencies['aws-lambda-mock-context'] = '^3.2.1';
  }

  if (flags.useServerless) {
    devDependencies.serverless = '^3.39.0';
    devDependencies['serverless-offline'] = '^13.6.0';
  }

  if (flags.useWorkers) {
    devDependencies.wrangler = '^3.63.0';
  }

  return { dependencies, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    build: 'tsc',
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

  if (flags.useServerless) {
    scripts.deploy = 'serverless deploy';
    scripts['deploy:dev'] = 'serverless deploy --stage dev';
  }

  if (flags.useWorkers) {
    scripts.dev = 'wrangler dev';
    scripts.deploy = 'wrangler deploy';
  }

  if (flags.useLint) {
    scripts.lint = 'eslint "{src,test}/**/*.ts" --fix';
    scripts.format = 'prettier --write "src/**/*.ts"';
  }

  if (flags.useTests) {
    scripts.test = 'jest';
    scripts['test:watch'] = 'jest --watch';
    scripts['test:cov'] = 'jest --coverage';
  }

  return scripts;
}

module.exports = {
  ormChoices,
  databaseChoices,
  brokerChoices,
  validationChoices,
  extraFeatureChoices,
  deriveFlags,
  resolveDependencies,
  resolveScripts,
};
