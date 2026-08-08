'use strict';

const {
  ORM_DATABASE_SUPPORT,
  DATABASE_LABELS,
  brokerChoices,
} = require('./features');

function ormChoices() {
  return [
    { name: 'GORM', value: 'gorm' },
    { name: 'None — in-memory repository', value: 'none' },
  ];
}

function databaseChoices(orm) {
  if (orm === 'gorm') {
    return [
      { name: 'PostgreSQL', value: 'postgres' },
      { name: 'MySQL / MariaDB', value: 'mysql' },
      { name: 'SQLite (file-based, no server)', value: 'sqlite' },
    ];
  }
  return [];
}

function validationChoices() {
  return [
    { name: 'go-playground/validator (standard)', value: 'go-validator' },
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'Swagger / OpenAPI docs (swaggo/swag)', value: 'swagger', checked: true },
    { name: 'golangci-lint', value: 'lint', checked: true },
    { name: 'Go test scaffold (built-in testing)', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test, build)', value: 'ci', checked: false },
    { name: 'JWT authentication (golang-jwt)', value: 'auth', checked: false },
    { name: 'Health check endpoint', value: 'health', checked: true },
    { name: 'Dockerfile for the app itself', value: 'dockerfile', checked: false },
    { name: 'Rate limiting', value: 'rateLimit', checked: false },
  ];
}

const DEFAULT_PORTS = {
  postgres: 5432,
  mysql: 3306,
};

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

    ormGorm: orm === 'gorm',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbSqlite: database === 'sqlite',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useValidator: validation === 'go-validator',
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

  flags.useDocker = flags.dbNeedsServer || flags.useRedis || flags.hasBroker;
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.hasBroker || flags.useAuth || flags.useHealthCheck;

  flags.goModule = true;

  return flags;
}

function resolveDependencies(flags) {
  const goModules = [];

  goModules.push({ module: 'github.com/joho/godotenv', version: 'v1.5.1' });

  if (flags.ormNone) {
    goModules.push({ module: 'github.com/google/uuid', version: 'v1.6.0' });
  }

  if (flags.useRateLimit) {
    goModules.push({ module: 'golang.org/x/time', version: 'v0.6.0' });
  }

  if (flags.ormGorm) {
    goModules.push({ module: 'gorm.io/gorm', version: 'v1.25.11' });
    if (flags.dbPostgres) goModules.push({ module: 'gorm.io/driver/postgres', version: 'v1.5.9' });
    if (flags.dbMysql) goModules.push({ module: 'gorm.io/driver/mysql', version: 'v1.5.7' });
    if (flags.dbSqlite) goModules.push({ module: 'gorm.io/driver/sqlite', version: 'v1.5.6' });
  }

  if (flags.useRedis) {
    goModules.push({ module: 'github.com/redis/go-redis/v9', version: 'v9.6.1' });
  }

  if (flags.useValidator) {
    goModules.push({ module: 'github.com/go-playground/validator/v10', version: 'v10.22.1' });
  }

  if (flags.useKafka) {
    goModules.push({ module: 'github.com/IBM/sarama', version: 'v1.43.3' });
  }

  if (flags.useRabbitmq) {
    goModules.push({ module: 'github.com/rabbitmq/amqp091-go', version: 'v1.10.0' });
  }

  if (flags.useSwagger) {
    goModules.push({ module: 'github.com/swaggo/swag', version: 'v1.16.3' });
  }

  if (flags.useAuth) {
    goModules.push({ module: 'github.com/golang-jwt/jwt/v5', version: 'v5.2.1' });
  }

  return { goModules };
}

function resolveScripts(flags) {
  const targets = [];

  if (flags.useTests) {
    targets.push({ phony: true, name: 'test', deps: '', cmd: 'go test ./... -v' });
    targets.push({ phony: true, name: 'test-cover', deps: '', cmd: 'go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out -o coverage.html' });
  }

  if (flags.useLint) {
    targets.push({ phony: true, name: 'lint', deps: '', cmd: 'golangci-lint run' });
  }

  if (flags.useSwagger) {
    targets.push({ phony: true, name: 'swagger', deps: '', cmd: 'swag init -g cmd/main.go -o internal/docs' });
  }

  return targets;
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
