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

function ormChoices() {
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

  // TypeORM and Mongoose decorate the entity class itself, so it has no
  // constructor and is built from an object literal instead.
  flags.hasOrmClassEntity = flags.ormTypeorm || flags.ormMongoose;

  // A compose file is only worth generating when something actually runs in it.
  flags.useDocker = flags.dbNeedsServer || flags.useRedis || flags.hasBroker;

  // src/shared/ only exists if some cross-cutting infrastructure was selected.
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.hasBroker;

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
  }

  if (flags.useDocker) {
    scripts['infra:up'] = 'docker compose up -d';
    scripts['infra:down'] = 'docker compose down';
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
  deriveFlags,
  resolveDependencies,
  resolveScripts,
};
