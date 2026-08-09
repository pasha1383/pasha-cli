'use strict';
const { ORM_DATABASE_SUPPORT, DATABASE_LABELS } = require('./shared');

function ormChoices() {
  return [
    { name: 'SQLAlchemy', value: 'sqlalchemy' },
    { name: 'None — in-memory', value: 'none' },
  ];
}

function databaseChoices(orm) {
  return (ORM_DATABASE_SUPPORT[orm] || []).map(v => ({ name: DATABASE_LABELS[v], value: v }));
}

function validationChoices() {
  return [{ name: 'None (Flask built-in)', value: 'none' }];
}

function brokerChoices() {
  return [{ name: 'None', value: 'none' }];
}

function extraFeatureChoices() {
  return [
    { name: 'Ruff (lint + format)', value: 'lint', checked: true },
    { name: 'Pytest test scaffold', value: 'tests', checked: true },
    { name: 'GitHub Actions CI', value: 'ci', checked: false },
    { name: 'Dockerfile', value: 'dockerfile', checked: false },
  ];
}

function deriveFlags(answers) {
  const orm = answers.orm || 'none';
  const database = answers.database || 'none';

  const flags = {
    orm, database,
    ormSqlalchemy: orm === 'sqlalchemy',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',
    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbSqlite: database === 'sqlite',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql'].includes(database),
    dbPort: ({ postgres: 5432, mysql: 3306 })[database] || null,
    hasValidation: false,
    useRedis: false,
    hasBroker: false,
    useAgentDocs: answers.useAgentDocs !== false,
    useSwagger: false,
    useLint: false,
    useTests: false,
    useCI: false,
    useAuth: false,
    useHealthCheck: false,
    useAppDockerfile: false,
    useRateLimit: false,
  };

  const extraSet = new Set(answers.extras || []);
  flags.useLint = extraSet.has('lint');
  flags.useTests = extraSet.has('tests');
  flags.useCI = extraSet.has('ci');
  flags.useAppDockerfile = extraSet.has('dockerfile');

  flags.useDocker = flags.dbNeedsServer || flags.useAppDockerfile;
  flags.hasSharedInfra = flags.hasOrm;
  flags.extras = extraSet;

  return flags;
}

function resolveDependencies(flags) {
  const req = ['flask>=3.0', 'python-dotenv>=1.0.0', 'flask-cors>=4.0.0'];
  const dev = [];
  if (flags.ormSqlalchemy) {
    req.push('flask-sqlalchemy>=3.1', 'sqlalchemy>=2.0.30');
    if (flags.dbPostgres) req.push('psycopg2-binary>=2.9.9');
    if (flags.dbMysql) req.push('pymysql>=1.1.0');
  }
  flags.extras = flags.extras || new Set();
  if (flags.extras.has('lint')) dev.push('ruff>=0.5.0');
  if (flags.extras.has('tests')) dev.push('pytest>=8.2.0');
  return { requirements: req, devRequirements: dev };
}

function resolveScripts(flags) {
  return {
    'run:dev': 'flask run --debug',
    'run:prod': 'gunicorn app:create_app',
  };
}

module.exports = { ormChoices, databaseChoices, validationChoices, brokerChoices, extraFeatureChoices, deriveFlags, resolveDependencies, resolveScripts };
