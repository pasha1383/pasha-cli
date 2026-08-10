'use strict';

const { ORM_DATABASE_SUPPORT, DATABASE_LABELS, DEFAULT_PORTS } = require('./shared');

function ormChoices(_framework) {
  return [
    { name: 'Eloquent ORM (built-in)', value: 'eloquent' },
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
    { name: 'Laravel Validator (built-in)', value: 'laravel' },
    { name: 'None', value: 'none' },
  ];
}

function brokerChoices() {
  return [
    { name: 'Redis Queue', value: 'redis-queue' },
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'Swagger / OpenAPI docs (L5-Swagger)', value: 'swagger', checked: true },
    { name: 'Pint (Laravel lint / CS Fixer)', value: 'lint', checked: true },
    { name: 'PHPUnit test scaffold', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test)', value: 'ci', checked: false },
    { name: 'Sanctum authentication', value: 'auth', checked: false },
    { name: 'Health check endpoint', value: 'health', checked: true },
    { name: 'Dockerfile for the app itself', value: 'dockerfile', checked: false },
    { name: 'Rate limiting', value: 'rateLimit', checked: false },
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

    ormEloquent: orm === 'eloquent',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbSqlite: database === 'sqlite',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useLaravelValidator: validation === 'laravel',
    hasValidation: validation !== 'none',

    useRedis: Boolean(answers.useRedis),

    useRedisQueue: broker === 'redis-queue',
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

  flags.useDocker = flags.dbNeedsServer || flags.useRedis || flags.hasBroker;
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.hasBroker || flags.useAuth || flags.useHealthCheck;

  return flags;
}

function resolveDependencies(flags) {
  const composerRequire = [];

  if (flags.ormEloquent) {
    if (flags.dbPostgres) composerRequire.push('doctrine/dbal:^4.0');
  }

  if (flags.useSwagger) {
    composerRequire.push('darkaonline/l5-swagger:^9.0');
  }

  if (flags.useAuth) {
    composerRequire.push('laravel/sanctum:^4.0');
  }

  if (flags.useRedis || flags.useRedisQueue) {
    composerRequire.push('predis/predis:^2.2');
  }

  const composerRequireDev = [];

  if (flags.useLint) {
    composerRequireDev.push('laravel/pint:^1.18');
  }

  if (flags.useTests) {
    composerRequireDev.push('phpunit/phpunit:^11.0');
    composerRequireDev.push('mockery/mockery:^1.6');
  }

  return { composerRequire, composerRequireDev };
}

function resolveScripts(flags) {
  const scripts = {
    serve: 'php artisan serve',
    'tinker': 'php artisan tinker',
    'route:list': 'php artisan route:list',
    'cache:clear': 'php artisan cache:clear',
    'config:clear': 'php artisan config:clear',
  };

  if (flags.ormEloquent) {
    scripts['migrate'] = 'php artisan migrate';
    scripts['migrate:fresh'] = 'php artisan migrate:fresh';
    scripts['migrate:rollback'] = 'php artisan migrate:rollback';
    scripts['make:migration'] = 'php artisan make:migration';
    scripts['make:model'] = 'php artisan make:model';
    scripts['db:seed'] = 'php artisan db:seed';
  }

  if (flags.useDocker) {
    scripts['infra:up'] = 'docker compose up -d';
    scripts['infra:down'] = 'docker compose down';
  }

  if (flags.useLint) {
    scripts.lint = './vendor/bin/pint';
    scripts['lint:test'] = './vendor/bin/pint --test';
  }

  if (flags.useTests) {
    scripts.test = './vendor/bin/phpunit';
    scripts['test:filter'] = './vendor/bin/phpunit --filter';
    scripts['test:coverage'] = 'XDEBUG_MODE=coverage ./vendor/bin/phpunit --coverage-html coverage';
  }

  if (flags.useSwagger) {
    scripts['swagger:generate'] = 'php artisan l5-swagger:generate';
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
