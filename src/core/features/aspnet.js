'use strict';

const ORM_DATABASE_SUPPORT = {
  efcore: ['postgres', 'sqlserver', 'sqlite'],
  dapper: ['postgres', 'sqlserver', 'sqlite'],
  none: [],
};

const DATABASE_LABELS = {
  postgres: 'PostgreSQL',
  sqlserver: 'SQL Server',
  sqlite: 'SQLite (file-based, no server)',
};

const DEFAULT_PORTS = {
  postgres: 5432,
  sqlserver: 1433,
};

function ormChoices(_framework) {
  return [
    { name: 'Entity Framework Core', value: 'efcore' },
    { name: 'Dapper', value: 'dapper' },
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
    { name: 'FluentValidation', value: 'fluent' },
    { name: 'Data Annotations', value: 'dataannotations' },
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'Swagger / OpenAPI (Swashbuckle)', value: 'swagger', checked: true },
    { name: 'StyleCop analyzers (lint)', value: 'stylecop', checked: true },
    { name: 'xUnit test scaffold', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test, build)', value: 'ci', checked: false },
    { name: 'JWT authentication', value: 'auth', checked: false },
    { name: 'Health checks endpoint', value: 'health', checked: true },
    { name: 'Dockerfile for the app itself', value: 'dockerfile', checked: false },
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

    ormEfcore: orm === 'efcore',
    ormDapper: orm === 'dapper',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbSqlserver: database === 'sqlserver',
    dbSqlite: database === 'sqlite',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'sqlserver'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useFluentValidation: validation === 'fluent',
    useDataAnnotations: validation === 'dataannotations',
    hasValidation: validation !== 'none',

    useRedis: Boolean(answers.useRedis),

    useKafka: broker === 'kafka',
    useRabbitmq: broker === 'rabbitmq',
    hasBroker: broker !== 'none',

    useAgentDocs: answers.useAgentDocs !== false,
  };

  const extras = new Set(answers.extras || []);
  flags.useSwagger = extras.has('swagger');
  flags.useStylecop = extras.has('stylecop');
  flags.useTests = extras.has('tests');
  flags.useCI = extras.has('ci');
  flags.useAuth = extras.has('auth');
  flags.useHealthCheck = extras.has('health');
  flags.useAppDockerfile = extras.has('dockerfile');

  flags.healthChecksDb = flags.useHealthCheck && flags.hasOrm;
  flags.healthChecksRedis = flags.useHealthCheck && flags.useRedis;

  flags.useDocker = flags.dbNeedsServer || flags.useRedis || flags.hasBroker;
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.hasBroker || flags.useAuth || flags.useHealthCheck;

  flags.dotnet8 = true;

  return flags;
}

function resolveDependencies(flags) {
  const packages = [];

  if (flags.useSwagger) {
    packages.push({ name: 'Swashbuckle.AspNetCore', version: '6.6.2' });
  }

  if (flags.ormEfcore) {
    packages.push({ name: 'Microsoft.EntityFrameworkCore', version: '8.0.8' });
    packages.push({ name: 'Microsoft.EntityFrameworkCore.Design', version: '8.0.8' });
    if (flags.dbPostgres) packages.push({ name: 'Npgsql.EntityFrameworkCore.PostgreSQL', version: '8.0.4' });
    if (flags.dbSqlserver) packages.push({ name: 'Microsoft.EntityFrameworkCore.SqlServer', version: '8.0.8' });
    if (flags.dbSqlite) packages.push({ name: 'Microsoft.EntityFrameworkCore.Sqlite', version: '8.0.8' });
  }

  if (flags.ormDapper) {
    packages.push({ name: 'Dapper', version: '2.1.35' });
    if (flags.dbPostgres) packages.push({ name: 'Npgsql', version: '8.0.3' });
    if (flags.dbSqlserver) packages.push({ name: 'Microsoft.Data.SqlClient', version: '5.2.1' });
    if (flags.dbSqlite) packages.push({ name: 'Microsoft.Data.Sqlite', version: '8.0.8' });
  }

  if (flags.useRedis) {
    packages.push({ name: 'Microsoft.Extensions.Caching.StackExchangeRedis', version: '8.0.8' });
  }

  if (flags.useKafka) {
    packages.push({ name: 'Confluent.Kafka', version: '2.5.3' });
  }

  if (flags.useRabbitmq) {
    packages.push({ name: 'MassTransit', version: '8.2.5' });
    packages.push({ name: 'MassTransit.RabbitMQ', version: '8.2.5' });
  }

  if (flags.useFluentValidation) {
    packages.push({ name: 'FluentValidation.AspNetCore', version: '11.3.0' });
  }

  if (flags.useAuth) {
    packages.push({ name: 'Microsoft.AspNetCore.Authentication.JwtBearer', version: '8.0.8' });
  }

  if (flags.useStylecop) {
    packages.push({ name: 'StyleCop.Analyzers', version: '1.2.0-beta.556' });
  }

  if (flags.useTests) {
    packages.push({ name: 'Microsoft.NET.Test.Sdk', version: '17.11.0', testProject: true });
    packages.push({ name: 'xunit', version: '2.9.0', testProject: true });
    packages.push({ name: 'xunit.runner.visualstudio', version: '2.8.2', testProject: true });
    packages.push({ name: 'Moq', version: '4.20.70', testProject: true });
    if (flags.ormEfcore) {
      packages.push({ name: 'Microsoft.EntityFrameworkCore.InMemory', version: '8.0.8', testProject: true });
    }
  }

  return { packages };
}

function resolveScripts(flags) {
  const scripts = {};

  scripts['build'] = 'dotnet build';
  scripts['run:dev'] = 'dotnet run --project src/{{projectName}}.Api';

  if (flags.useDocker) {
    scripts['infra:up'] = 'docker compose up -d';
    scripts['infra:down'] = 'docker compose down';
  }

  if (flags.useStylecop) {
    scripts['lint'] = 'dotnet format style --verify-no-changes';
    scripts['format'] = 'dotnet format style';
  }

  if (flags.useTests) {
    scripts['test'] = 'dotnet test';
    scripts['test:unit'] = 'dotnet test';
  }

  return scripts;
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
};
