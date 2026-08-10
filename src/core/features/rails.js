'use strict';

const ORM_DATABASE_SUPPORT = {
  activerecord: ['postgres', 'mysql', 'sqlite'],
  none: [],
};

const DATABASE_LABELS = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  sqlite: 'SQLite (file-based, no server)',
};

const DEFAULT_PORTS = {
  postgres: 5432,
  mysql: 3306,
};

function ormChoices() {
  return [
    { name: 'ActiveRecord', value: 'activerecord' },
    { name: 'None — in-memory repository', value: 'none' },
  ];
}

function databaseChoices(orm) {
  return (ORM_DATABASE_SUPPORT[orm] || []).map(v => ({ name: DATABASE_LABELS[v], value: v }));
}

function validationChoices() {
  return [
    { name: 'Rails Validations (ActiveModel)', value: 'active-model' },
    { name: 'None', value: 'none' },
  ];
}

function brokerChoices() {
  return [
    { name: 'None', value: 'none' },
    { name: 'Sidekiq / Redis', value: 'sidekiq' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'API Docs (rswag / OpenAPI)', value: 'swagger', checked: true },
    { name: 'RuboCop (lint + format)', value: 'lint', checked: true },
    { name: 'RSpec test scaffold', value: 'tests', checked: true },
    { name: 'GitHub Actions CI', value: 'ci', checked: false },
    { name: 'Devise + JWT authentication', value: 'auth', checked: false },
    { name: 'Health check endpoint', value: 'health', checked: true },
    { name: 'Dockerfile for the app itself', value: 'dockerfile', checked: false },
    { name: 'Rate limiting (rack-attack)', value: 'rateLimit', checked: false },
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

    ormActiverecord: orm === 'activerecord',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbSqlite: database === 'sqlite',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useActiveModelValidation: validation === 'active-model',
    hasValidation: validation !== 'none',

    useRedis: broker === 'sidekiq',
    useSidekiq: broker === 'sidekiq',
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

  flags.useRSpec = flags.useTests;

  flags.useDocker = flags.dbNeedsServer || flags.useSidekiq || flags.useAppDockerfile;
  flags.hasSharedInfra = flags.hasOrm || flags.useSidekiq || flags.hasBroker || flags.useAuth || flags.useHealthCheck;

  flags.extras = extras;

  return flags;
}

function resolveDependencies(flags) {
  const gemfileGems = [
    '"rails", "~> 7.2"',
    '"puma", "~> 6.4"',
    '"rack-cors", "~> 2.0"',
    '"bootsnap", require: false',
    '"tzinfo-data", platforms: %i[windows jruby]',
  ];

  const gemfileDevGems = [
    '"debug", platforms: %i[mri windows]',
    '"dotenv-rails", "~> 3.1"',
  ];

  if (flags.dbPostgres) {
    gemfileGems.push('"pg", "~> 1.5"');
  }

  if (flags.dbMysql) {
    gemfileGems.push('"mysql2", "~> 0.5"');
  }

  if (flags.dbSqlite) {
    gemfileGems.push('"sqlite3", "~> 1.7"');
  }

  if (flags.useSidekiq) {
    gemfileGems.push('"sidekiq", "~> 7.3"');
  }

  if (flags.useSwagger) {
    gemfileGems.push('"rswag-api", "~> 2.13"');
    gemfileGems.push('"rswag-ui", "~> 2.13"');
    gemfileDevGems.push('"rswag-specs", "~> 2.13"');
  }

  if (flags.useAuth) {
    gemfileGems.push('"devise", "~> 4.9"');
    gemfileGems.push('"devise-jwt", "~> 0.12"');
    gemfileGems.push('"bcrypt", "~> 3.1.20"');
  }

  if (flags.useHealthCheck) {
    gemfileGems.push('"okcomputer", "~> 1.18"');
  }

  if (flags.useRateLimit) {
    gemfileGems.push('"rack-attack", "~> 6.7"');
  }

  if (flags.useLint) {
    gemfileDevGems.push('"rubocop", "~> 1.63"');
    gemfileDevGems.push('"rubocop-rails", "~> 2.24"');
    gemfileDevGems.push('"rubocop-rspec", "~> 2.29"');
  }

  if (flags.useRSpec) {
    gemfileDevGems.push('"rspec-rails", "~> 6.1"');
    gemfileDevGems.push('"factory_bot_rails", "~> 6.4"');
    gemfileDevGems.push('"shoulda-matchers", "~> 6.2"');
  }

  return { gemfileGems, gemfileDevGems };
}

function resolveScripts(flags) {
  const scripts = {
    'server': 'bin/rails server',
    'console': 'bin/rails console',
    'db:migrate': 'bin/rails db:migrate',
    'db:rollback': 'bin/rails db:rollback',
    'db:seed': 'bin/rails db:seed',
    'db:reset': 'bin/rails db:reset',
  };

  if (flags.hasOrm) {
    scripts['db:create'] = 'bin/rails db:create';
    scripts['db:setup'] = 'bin/rails db:setup';
  }

  if (flags.useDocker) {
    scripts['infra:up'] = 'docker compose up -d';
    scripts['infra:down'] = 'docker compose down';
  }

  if (flags.useLint) {
    scripts['lint'] = 'bundle exec rubocop';
    scripts['lint:autocorrect'] = 'bundle exec rubocop -A';
  }

  if (flags.useTests) {
    scripts['spec'] = 'bundle exec rspec';
    scripts['spec:models'] = 'bundle exec rspec spec/models';
    scripts['spec:requests'] = 'bundle exec rspec spec/requests';
  }

  if (flags.useSwagger) {
    scripts['rswag'] = 'RAILS_ENV=test bin/rails rswag';
  }

  return scripts;
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
