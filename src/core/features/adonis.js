'use strict';

const { ORM_DATABASE_SUPPORT, DATABASE_LABELS, DEFAULT_PORTS } = require('./shared');

function ormChoices(_framework) {
  return [
    { name: 'Lucid ORM (built-in)', value: 'lucid' },
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
    { name: 'Adonis Validator (vine)', value: 'vine' },
    { name: 'None', value: 'none' },
  ];
}

function brokerChoices() {
  return [
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'Swagger / OpenAPI docs', value: 'swagger', checked: true },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Japa test scaffold (unit + e2e)', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test)', value: 'ci', checked: false },
    { name: 'JWT authentication (Adonis Auth)', value: 'auth', checked: false },
    { name: 'Health check endpoint', value: 'health', checked: true },
    { name: 'Dockerfile for the app itself', value: 'dockerfile', checked: false },
    { name: 'Rate limiting (Adonis shield)', value: 'rateLimit', checked: false },
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

    ormLucid: orm === 'lucid',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbSqlite: database === 'sqlite',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useVine: validation === 'vine',
    hasValidation: validation !== 'none',

    useRedis: Boolean(answers.useRedis),

    hasBroker: broker !== 'none',
    useKafka: broker === 'kafka',
    useRabbitmq: broker === 'rabbitmq',

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

  flags.useDocker = flags.dbNeedsServer || flags.useRedis || flags.hasBroker;
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.hasBroker || flags.useAuth || flags.useHealthCheck;

  return flags;
}

function resolveDependencies(flags) {
  const dependencies = {
    '@adonisjs/core': '^6.12.0',
    '@adonisjs/bodyparser': '^8.1.0',
    '@adonisjs/cors': '^2.2.0',
    dotenv: '^16.4.5',
  };

  const devDependencies = {
    '@adonisjs/assembler': '^7.0.0',
    typescript: '^5.4.0',
    '@types/node': '^20.0.0',
    '@adonisjs/tsconfig': '^1.3.0',
  };

  if (flags.ormLucid) {
    dependencies['@adonisjs/lucid'] = '^20.1.0';
    if (flags.dbPostgres) dependencies.pg = '^8.11.5';
    if (flags.dbMysql) dependencies.mysql2 = '^3.9.7';
    if (flags.dbSqlite) {
      dependencies['better-sqlite3'] = '^11.0.0';
      devDependencies['@types/better-sqlite3'] = '^7.6.10';
    }
  }

  if (flags.useVine) {
    dependencies['@vinejs/vine'] = '^2.1.0';
  }

  if (flags.useRedis) {
    dependencies['@adonisjs/redis'] = '^10.0.0';
    dependencies.ioredis = '^5.4.1';
  }

  if (flags.useSwagger) {
    dependencies['@adonisjs/static'] = '^2.0.0';
    dependencies['adonis-autoswagger'] = '^3.0.0';
  }

  if (flags.useAuth) {
    dependencies['@adonisjs/auth'] = '^9.0.0';
    dependencies.jsonwebtoken = '^9.0.2';
    devDependencies['@types/jsonwebtoken'] = '^9.0.6';
  }

  if (flags.useRateLimit) {
    dependencies['@adonisjs/shield'] = '^5.0.0';
  }

  if (flags.useLint) {
    devDependencies.eslint = '^8.57.0';
    devDependencies['@adonisjs/eslint-config'] = '^1.3.0';
    devDependencies['@typescript-eslint/eslint-plugin'] = '^7.7.1';
    devDependencies['@typescript-eslint/parser'] = '^7.7.1';
    devDependencies['eslint-config-prettier'] = '^9.1.0';
    devDependencies['eslint-plugin-prettier'] = '^5.1.3';
    devDependencies.prettier = '^3.2.5';
  }

  if (flags.useTests) {
    devDependencies['@japa/preset-adonis'] = '^2.0.0';
    devDependencies['@japa/assert'] = '^3.0.0';
    devDependencies['@japa/runner'] = '^3.0.0';
    devDependencies['@japa/api-client'] = '^3.0.0';
    devDependencies['@japa/expect'] = '^3.0.0';
  }

  return { dependencies, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    dev: 'node ace serve --hmr',
    build: 'node ace build',
    start: 'node build/server.js',
  };

  if (flags.ormLucid) {
    scripts['migration:run'] = 'node ace migration:run';
    scripts['migration:rollback'] = 'node ace migration:rollback';
    scripts['migration:make'] = 'node ace make:migration';
  }

  if (flags.useDocker) {
    scripts['infra:up'] = 'docker compose up -d';
    scripts['infra:down'] = 'docker compose down';
  }

  if (flags.useLint) {
    scripts.lint = 'eslint "{src,app,start,config,test}/**/*.ts" --fix';
    scripts.format = 'prettier --write "src/**/*.ts" "app/**/*.ts"';
  }

  if (flags.useTests) {
    scripts.test = 'node ace test';
    scripts['test:e2e'] = 'node ace test:e2e';
  }

  return scripts;
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
};
