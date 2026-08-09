'use strict';
const { ORM_DATABASE_SUPPORT, DATABASE_LABELS } = require('./shared');

function ormChoices(_fw) {
  return [
    { name: 'Prisma', value: 'prisma' },
    { name: 'TypeORM', value: 'typeorm' },
    { name: 'Mongoose', value: 'mongoose' },
    { name: 'None — in-memory', value: 'none' },
  ];
}
function databaseChoices(orm) { return (ORM_DATABASE_SUPPORT[orm] || []).map(v => ({ name: DATABASE_LABELS[v], value: v })); }
function validationChoices() {
  return [
    { name: 'Joi (Hapi native)', value: 'joi' },
    { name: 'Zod', value: 'zod' },
    { name: 'None', value: 'none' },
  ];
}
function brokerChoices() { return [{ name: 'None', value: 'none' }]; }
function extraFeatureChoices() {
  return [
    { name: 'Swagger / OpenAPI (hapi-swagger)', value: 'swagger', checked: true },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Jest test scaffold', value: 'tests', checked: true },
    { name: 'GitHub Actions CI', value: 'ci', checked: false },
    { name: 'JWT auth (hapi-auth-jwt2)', value: 'auth', checked: false },
    { name: 'Health check endpoint', value: 'health', checked: true },
    { name: 'Dockerfile', value: 'dockerfile', checked: false },
    { name: 'Rate limiting', value: 'rateLimit', checked: false },
  ];
}
function deriveFlags(answers) {
  const orm = answers.orm || 'none';
  const database = answers.database || 'none';
  const validation = answers.validation || 'none';
  const flags = {
    orm, database, validation,
    ormPrisma: orm === 'prisma', ormTypeorm: orm === 'typeorm', ormMongoose: orm === 'mongoose', ormNone: orm === 'none', hasOrm: orm !== 'none',
    dbPostgres: database === 'postgres', dbMysql: database === 'mysql', dbMongo: database === 'mongo', dbSqlite: database === 'sqlite', hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql', 'mongo'].includes(database), dbPort: ({ postgres: 5432, mysql: 3306, mongo: 27017 })[database] || null,
    useJoi: validation === 'joi', useZod: validation === 'zod', hasValidation: validation !== 'none',
    useRedis: Boolean(answers.useRedis), hasBroker: false,
    useAgentDocs: answers.useAgentDocs !== false,
    hasOrmClassEntity: orm === 'typeorm' || orm === 'mongoose',
  };
  const extras = new Set(answers.extras || []);
  flags.useSwagger = extras.has('swagger'); flags.useLint = extras.has('lint');
  flags.useTests = extras.has('tests'); flags.useCI = extras.has('ci');
  flags.useAuth = extras.has('auth'); flags.useHealthCheck = extras.has('health');
  flags.useAppDockerfile = extras.has('dockerfile'); flags.useRateLimit = extras.has('rateLimit');
  flags.healthChecksDb = flags.useHealthCheck && flags.hasOrm;
  flags.healthChecksRedis = flags.useHealthCheck && flags.useRedis;
  flags.useDocker = flags.dbNeedsServer || flags.useRedis;
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.useAuth || flags.useHealthCheck;
  return flags;
}
function resolveDependencies(flags) {
  const deps = { '@hapi/hapi': '^21.3.0', dotenv: '^16.4.5' };
  const dev = { typescript: '^5.4.0', tsx: '^4.11.0', '@types/hapi__hapi': '^21.0.0', '@types/node': '^20.0.0' };
  if (flags.ormPrisma) { deps['@prisma/client'] = '^5.14.0'; dev.prisma = '^5.14.0'; }
  if (flags.ormTypeorm) { deps.typeorm = '^0.3.20'; deps['reflect-metadata'] = '^0.2.0'; if (flags.dbPostgres) deps.pg = '^8.11.5'; if (flags.dbMysql) deps.mysql2 = '^3.9.7'; if (flags.dbSqlite) deps.sqlite3 = '^5.1.7'; if (flags.dbMongo) deps.mongodb = '^5.9.2'; }
  if (flags.ormMongoose) { deps.mongoose = '^8.4.0'; }
  if (flags.useJoi) { deps.joi = '^17.13.0'; }
  if (flags.useZod) { deps.zod = '^3.23.8'; }
  if (flags.useRedis) { deps.ioredis = '^5.4.1'; }
  if (flags.useSwagger) { deps['hapi-swagger'] = '^17.2.0'; deps['@hapi/vision'] = '^7.0.0'; deps['@hapi/inert'] = '^7.1.0'; }
  if (flags.useAuth) { deps['hapi-auth-jwt2'] = '^10.3.0'; deps.jsonwebtoken = '^9.0.2'; dev['@types/jsonwebtoken'] = '^9.0.6'; }
  if (flags.useRateLimit) { deps['hapi-rate-limit'] = '^7.0.0'; }
  if (flags.useLint) { dev.eslint = '^8.57.0'; dev['@typescript-eslint/eslint-plugin'] = '^7.7.1'; dev['@typescript-eslint/parser'] = '^7.7.1'; dev['eslint-config-prettier'] = '^9.1.0'; dev['eslint-plugin-prettier'] = '^5.1.3'; dev.prettier = '^3.2.5'; }
  if (flags.useTests) { dev.jest = '^29.7.0'; dev['@types/jest'] = '^29.5.12'; dev['ts-jest'] = '^29.1.2'; dev.supertest = '^7.0.0'; dev['@types/supertest'] = '^6.0.2'; }
  return { dependencies: deps, devDependencies: dev };
}
function resolveScripts(flags) {
  const s = { build: 'tsc', start: 'node dist/main.js', 'start:dev': 'tsx watch src/main.ts' };
  if (flags.ormPrisma) { s['prisma:migrate'] = 'prisma migrate dev'; s['prisma:generate'] = 'prisma generate'; }
  if (flags.useDocker) { s['infra:up'] = 'docker compose up -d'; s['infra:down'] = 'docker compose down'; }
  if (flags.useLint) { s.lint = 'eslint "{src,test}/**/*.ts" --fix'; s.format = 'prettier --write "src/**/*.ts"'; }
  if (flags.useTests) { s.test = 'jest'; s['test:watch'] = 'jest --watch'; s['test:cov'] = 'jest --coverage'; s['test:e2e'] = 'jest --config jest.e2e.config.ts'; }
  return s;
}
function resolveJestConfig() {
  return {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: { '^.+\\.(t|j)s$': 'ts-jest' },
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
  };
}
module.exports = {
  ormChoices, databaseChoices, validationChoices, brokerChoices,
  extraFeatureChoices, deriveFlags, resolveDependencies, resolveScripts,
  resolveJestConfig,
};
