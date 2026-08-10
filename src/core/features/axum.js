'use strict';

const ORM_DATABASE_SUPPORT = {
  sqlx: ['postgres', 'mysql', 'sqlite'],
  diesel: ['postgres', 'mysql', 'sqlite'],
  'sea-orm': ['postgres', 'mysql', 'sqlite'],
  none: [],
};

const DATABASE_LABELS = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  sqlite: 'SQLite (file-based, no server)',
};

function brokerChoices() {
  return [
    { name: 'Kafka (rdkafka)', value: 'kafka' },
    { name: 'None', value: 'none' },
  ];
}

function ormChoices(_framework) {
  return [
    { name: 'SQLx (async, compile-time checked)', value: 'sqlx' },
    { name: 'Diesel (sync, type-safe)', value: 'diesel' },
    { name: 'SeaORM (async ORM)', value: 'sea-orm' },
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
    { name: 'validator (derive macros)', value: 'validator' },
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'OpenAPI docs (utoipa)', value: 'openapi', checked: true },
    { name: 'Clippy (built-in Rust linter)', value: 'lint', checked: true },
    { name: 'Rust test scaffold (built-in)', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test, build)', value: 'ci', checked: false },
    { name: 'JWT authentication (jsonwebtoken)', value: 'auth', checked: false },
    { name: 'Health check endpoint', value: 'health', checked: true },
    { name: 'Dockerfile for the app itself', value: 'dockerfile', checked: false },
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

    ormSqlx: orm === 'sqlx',
    ormDiesel: orm === 'diesel',
    ormSeaOrm: orm === 'sea-orm',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbSqlite: database === 'sqlite',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useValidator: validation === 'validator',
    hasValidation: validation !== 'none',

    useRedis: Boolean(answers.useRedis),

    useKafka: broker === 'kafka',
    useRabbitmq: broker === 'rabbitmq',
    hasBroker: broker !== 'none',

    useAgentDocs: answers.useAgentDocs !== false,
  };

  const extras = new Set(answers.extras || []);
  flags.useOpenApi = extras.has('openapi');
  flags.useLint = extras.has('lint');
  flags.useTests = extras.has('tests');
  flags.useCI = extras.has('ci');
  flags.useAuth = extras.has('auth');
  flags.useHealthCheck = extras.has('health');
  flags.useAppDockerfile = extras.has('dockerfile');

  flags.healthChecksDb = flags.useHealthCheck && flags.hasOrm;
  flags.healthChecksRedis = flags.useHealthCheck && flags.useRedis;

  flags.useDocker = flags.dbNeedsServer || flags.useRedis || flags.hasBroker;
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.hasBroker || flags.useAuth || flags.useHealthCheck || flags.useOpenApi;

  return flags;
}

function resolveDependencies(flags) {
  const cargoDeps = [];

  cargoDeps.push({ name: 'axum', version: '0.7', features: ['macros'] });
  cargoDeps.push({ name: 'tokio', version: '1', features: ['full'] });
  cargoDeps.push({ name: 'serde', version: '1', features: ['derive'] });
  cargoDeps.push({ name: 'serde_json', version: '1', features: [] });
  cargoDeps.push({ name: 'tower', version: '0.4', features: [] });
  cargoDeps.push({ name: 'tower-http', version: '0.5', features: ['cors', 'trace'] });
  cargoDeps.push({ name: 'tracing', version: '0.1', features: [] });
  cargoDeps.push({ name: 'tracing-subscriber', version: '0.3', features: ['env-filter'] });
  cargoDeps.push({ name: 'dotenvy', version: '0.15', features: [] });

  if (flags.ormNone) {
    cargoDeps.push({ name: 'uuid', version: '1', features: ['v4'] });
  }

  if (flags.ormSqlx) {
    const features = ['runtime-tokio-rustls', 'chrono', 'uuid'];
    if (flags.dbPostgres) features.push('postgres');
    if (flags.dbMysql) features.push('mysql');
    if (flags.dbSqlite) features.push('sqlite');
    cargoDeps.push({ name: 'sqlx', version: '0.7', features });
    cargoDeps.push({ name: 'chrono', version: '0.4', features: ['serde'] });
  }

  if (flags.ormDiesel) {
    const dieselFeatures = ['chrono', 'r2d2'];
    if (flags.dbPostgres) dieselFeatures.push('postgres');
    if (flags.dbMysql) dieselFeatures.push('mysql');
    if (flags.dbSqlite) dieselFeatures.push('sqlite');
    cargoDeps.push({ name: 'diesel', version: '2.2', features: dieselFeatures });
    cargoDeps.push({ name: 'chrono', version: '0.4', features: ['serde'] });
  }

  if (flags.ormSeaOrm) {
    const seaOrmFeatures = ['macros', 'runtime-tokio-rustls', 'with-chrono', 'with-uuid'];
    if (flags.dbPostgres) seaOrmFeatures.push('sqlx-postgres');
    if (flags.dbMysql) seaOrmFeatures.push('sqlx-mysql');
    if (flags.dbSqlite) seaOrmFeatures.push('sqlx-sqlite');
    cargoDeps.push({ name: 'sea-orm', version: '0.12', features: seaOrmFeatures });
    cargoDeps.push({ name: 'chrono', version: '0.4', features: ['serde'] });
    cargoDeps.push({ name: 'uuid', version: '1', features: ['v4', 'serde'] });
  }

  if (flags.useRedis) {
    cargoDeps.push({ name: 'redis', version: '0.25', features: ['tokio-comp'] });
  }

  if (flags.useValidator) {
    cargoDeps.push({ name: 'validator', version: '0.18', features: ['derive'] });
  }

  if (flags.useKafka) {
    cargoDeps.push({ name: 'rdkafka', version: '0.36', features: ['tokio'] });
  }

  if (flags.useOpenApi) {
    cargoDeps.push({ name: 'utoipa', version: '4', features: ['axum_extras'] });
    cargoDeps.push({ name: 'utoipa-swagger-ui', version: '6', features: ['axum'] });
  }

  if (flags.useAuth) {
    cargoDeps.push({ name: 'jsonwebtoken', version: '9', features: [] });
    cargoDeps.push({ name: 'argon2', version: '0.5', features: [] });
    cargoDeps.push({ name: 'axum-extra', version: '0.9', features: ['typed-header'] });
  }

  return { cargoDeps };
}

function resolveScripts(flags) {
  const targets = [];

  targets.push({ phony: true, name: 'build', deps: '', cmd: 'cargo build --release' });
  targets.push({ phony: true, name: 'run', deps: '', cmd: 'cargo run' });
  targets.push({ phony: true, name: 'dev', deps: '', cmd: 'cargo watch -x run' });

  if (flags.useTests) {
    targets.push({ phony: true, name: 'test', deps: '', cmd: 'cargo test' });
    targets.push({ phony: true, name: 'test-cover', deps: '', cmd: 'cargo tarpaulin --out Html --output-dir coverage' });
  }

  if (flags.useLint) {
    targets.push({ phony: true, name: 'lint', deps: '', cmd: 'cargo clippy -- -D warnings' });
    targets.push({ phony: true, name: 'fmt', deps: '', cmd: 'cargo fmt --all -- --check' });
    targets.push({ phony: true, name: 'fmt-fix', deps: '', cmd: 'cargo fmt --all' });
  }

  if (flags.useDocker) {
    targets.push({ phony: true, name: 'infra-up', deps: '', cmd: 'docker compose up -d' });
    targets.push({ phony: true, name: 'infra-down', deps: '', cmd: 'docker compose down' });
  }

  if (flags.ormDiesel) {
    targets.push({ phony: true, name: 'db-setup', deps: '', cmd: 'diesel setup' });
    targets.push({ phony: true, name: 'db-migrate', deps: '', cmd: 'diesel migration run' });
    targets.push({ phony: true, name: 'db-generate', deps: '', cmd: 'diesel migration generate $(name)' });
  }

  if (flags.ormSqlx) {
    targets.push({ phony: true, name: 'db-create', deps: '', cmd: 'cargo sqlx database create' });
    targets.push({ phony: true, name: 'db-migrate', deps: '', cmd: 'cargo sqlx migrate run' });
    targets.push({ phony: true, name: 'db-prepare', deps: '', cmd: 'cargo sqlx prepare --workspace' });
  }

  if (flags.ormSeaOrm) {
    targets.push({ phony: true, name: 'db-migrate', deps: '', cmd: 'cargo run -- migrate' });
  }

  return targets;
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
};
