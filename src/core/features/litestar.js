'use strict';

const { ORM_DATABASE_SUPPORT, DATABASE_LABELS } = require('./shared');

const DEFAULT_PORTS = {
  postgres: 5432,
  mysql: 3306,
};

function ormChoices(_framework) {
  return [
    { name: 'SQLAlchemy', value: 'sqlalchemy' },
    { name: 'Tortoise ORM (async)', value: 'tortoise' },
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
    { name: 'Pydantic v2', value: 'pydantic' },
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
    { name: 'Ruff (lint + format)', value: 'lint', checked: true },
    { name: 'Pytest test scaffold', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test)', value: 'ci', checked: false },
    { name: 'JWT authentication', value: 'auth', checked: false },
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

    ormSqlalchemy: orm === 'sqlalchemy',
    ormTortoise: orm === 'tortoise',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbSqlite: database === 'sqlite',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    usePydantic: validation === 'pydantic',
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

  return flags;
}

function resolveDependencies(flags) {
  const requirements = [];
  const devRequirements = [];

  requirements.push('litestar>=2.8.0');
  requirements.push('uvicorn[standard]>=0.30.0');
  requirements.push('python-dotenv>=1.0.0');

  if (flags.ormSqlalchemy) {
    requirements.push('sqlalchemy>=2.0.30');
    devRequirements.push('alembic>=1.13.0');
    if (flags.dbPostgres) {
      requirements.push('asyncpg>=0.29.0');
      requirements.push('psycopg2-binary>=2.9.9');
    }
    if (flags.dbMysql) requirements.push('pymysql>=1.1.0');
    if (flags.dbSqlite) requirements.push('aiosqlite>=0.20.0');
  }

  if (flags.ormTortoise) {
    requirements.push('tortoise-orm>=0.20.0');
    requirements.push('aerich>=0.7.0');
    if (flags.dbPostgres) requirements.push('asyncpg>=0.29.0');
    if (flags.dbMysql) requirements.push('aiomysql>=0.2.0');
    if (flags.dbSqlite) requirements.push('aiosqlite>=0.20.0');
  }

  if (flags.usePydantic) {
    requirements.push('pydantic>=2.7.0');
    requirements.push('pydantic-settings>=2.3.0');
  }

  if (flags.useRedis) {
    requirements.push('redis>=5.0.0');
  }

  if (flags.useKafka) requirements.push('aiokafka>=0.11.0');
  if (flags.useRabbitmq) requirements.push('aio-pika>=9.4.0');

  if (flags.useSwagger) {
    requirements.push('litestar-openapi>=0.1.0');
  }

  if (flags.useAuth) {
    requirements.push('pyjwt>=2.8.0');
    requirements.push('passlib[bcrypt]>=1.7.0');
    requirements.push('python-multipart>=0.0.9');
    requirements.push('advanced-alchemy>=0.8.0');
  }

  if (flags.useRateLimit) {
    requirements.push('slowapi>=0.1.9');
  }

  if (flags.useLint) {
    devRequirements.push('ruff>=0.5.0');
  }

  if (flags.useTests) {
    devRequirements.push('pytest>=8.2.0');
    devRequirements.push('pytest-asyncio>=0.23.0');
    devRequirements.push('httpx>=0.27.0');
  }

  return { requirements, devRequirements };
}

function resolveScripts(flags) {
  const scripts = {
    'run:dev': 'litestar run --reload --host 0.0.0.0 --port 8000',
  };

  if (flags.useDocker) {
    scripts['infra:up'] = 'docker compose up -d';
    scripts['infra:down'] = 'docker compose down';
  }

  if (flags.useLint) {
    scripts.lint = 'ruff check .';
    scripts.format = 'ruff format .';
  }

  if (flags.useTests) {
    scripts.test = 'pytest';
    scripts['test:cov'] = 'pytest --cov=. --cov-report=term-missing';
  }

  if (flags.ormSqlalchemy) {
    scripts['db:init'] = 'alembic init -t async migrations';
    scripts['db:migrate'] = 'alembic revision --autogenerate -m "auto"';
    scripts['db:upgrade'] = 'alembic upgrade head';
  }

  if (flags.ormTortoise) {
    scripts['aerich:init'] = 'aerich init -t src.shared.database.tortoise.TORTOISE_ORM';
    scripts['aerich:migrate'] = 'aerich migrate';
    scripts['aerich:upgrade'] = 'aerich upgrade';
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
