'use strict';

const ORM_DATABASE_SUPPORT = {
  jpa: ['postgres', 'mysql', 'h2'],
  mybatis: ['postgres', 'mysql', 'h2'],
  none: [],
};

const DATABASE_LABELS = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  h2: 'H2 (embedded, in-memory)',
};

const DEFAULT_PORTS = {
  postgres: 5432,
  mysql: 3306,
};

function ormChoices(_framework) {
  return [
    { name: 'JPA / Hibernate', value: 'jpa' },
    { name: 'MyBatis', value: 'mybatis' },
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
    { name: 'Jakarta Bean Validation (Hibernate Validator)', value: 'bean-validation' },
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'Swagger / OpenAPI (springdoc)', value: 'swagger', checked: true },
    { name: 'Checkstyle (lint)', value: 'checkstyle', checked: true },
    { name: 'JUnit test scaffold', value: 'tests', checked: true },
    { name: 'GitHub Actions CI (lint, test, build)', value: 'ci', checked: false },
    { name: 'JWT authentication (Spring Security)', value: 'auth', checked: false },
    { name: 'Actuator health check', value: 'health', checked: true },
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

    ormJpa: orm === 'jpa',
    ormMybatis: orm === 'mybatis',
    ormNone: orm === 'none',
    hasOrm: orm !== 'none',

    dbPostgres: database === 'postgres',
    dbMysql: database === 'mysql',
    dbH2: database === 'h2',
    hasDatabase: database !== 'none',
    dbNeedsServer: ['postgres', 'mysql'].includes(database),
    dbPort: DEFAULT_PORTS[database] || null,

    useBeanValidation: validation === 'bean-validation',
    hasValidation: validation !== 'none',

    useRedis: Boolean(answers.useRedis),

    useKafka: broker === 'kafka',
    useRabbitmq: broker === 'rabbitmq',
    hasBroker: broker !== 'none',

    useAgentDocs: answers.useAgentDocs !== false,
  };

  const extras = new Set(answers.extras || []);
  flags.useSwagger = extras.has('swagger');
  flags.useCheckstyle = extras.has('checkstyle');
  flags.useTests = extras.has('tests');
  flags.useCI = extras.has('ci');
  flags.useAuth = extras.has('auth');
  flags.useHealthCheck = extras.has('health');
  flags.useAppDockerfile = extras.has('dockerfile');

  flags.healthChecksDb = flags.useHealthCheck && flags.hasOrm;
  flags.healthChecksRedis = flags.useHealthCheck && flags.useRedis;

  flags.useDocker = flags.dbNeedsServer || flags.useRedis || flags.hasBroker;
  flags.hasSharedInfra = flags.hasOrm || flags.useRedis || flags.hasBroker || flags.useAuth || flags.useHealthCheck;

  flags.java17 = true;
  flags.springBoot = true;

  return flags;
}

function formatMavenDep(dep) {
  let xml = '        <dependency>\n            <groupId>' + dep.groupId + '</groupId>\n            <artifactId>' + dep.artifactId + '</artifactId>';
  if (dep.version) xml += '\n            <version>' + dep.version + '</version>';
  if (dep.scope) xml += '\n            <scope>' + dep.scope + '</scope>';
  xml += '\n        </dependency>';
  return xml;
}

function formatMavenPlugin(dep) {
  return '            <plugin>\n                <groupId>' + dep.groupId + '</groupId>\n                <artifactId>' + dep.artifactId + '</artifactId>\n                <version>' + dep.version + '</version>\n            </plugin>';
}

function resolveDependencies(flags) {
  const dependencies = [];
  const devDependencies = [];
  const plugins = [];

  dependencies.push(formatMavenDep({ groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-web', scope: null }));
  dependencies.push(formatMavenDep({ groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-validation', scope: null }));
  dependencies.push(formatMavenDep({ groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-actuator', scope: null }));
  dependencies.push(formatMavenDep({ groupId: 'me.paulschwarz', artifactId: 'spring-dotenv', version: '4.0.0', scope: null }));

  if (flags.ormJpa) {
    dependencies.push(formatMavenDep({ groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-data-jpa', scope: null }));
    if (flags.dbPostgres) dependencies.push(formatMavenDep({ groupId: 'org.postgresql', artifactId: 'postgresql', scope: 'runtime' }));
    if (flags.dbMysql) dependencies.push(formatMavenDep({ groupId: 'com.mysql', artifactId: 'mysql-connector-j', scope: 'runtime' }));
    if (flags.dbH2) dependencies.push(formatMavenDep({ groupId: 'com.h2database', artifactId: 'h2', scope: 'runtime' }));
  }

  if (flags.ormMybatis) {
    dependencies.push(formatMavenDep({ groupId: 'org.mybatis.spring.boot', artifactId: 'mybatis-spring-boot-starter', version: '3.0.3', scope: null }));
    if (flags.dbPostgres) dependencies.push(formatMavenDep({ groupId: 'org.postgresql', artifactId: 'postgresql', scope: 'runtime' }));
    if (flags.dbMysql) dependencies.push(formatMavenDep({ groupId: 'com.mysql', artifactId: 'mysql-connector-j', scope: 'runtime' }));
    if (flags.dbH2) dependencies.push(formatMavenDep({ groupId: 'com.h2database', artifactId: 'h2', scope: 'runtime' }));
  }

  if (flags.useRedis) {
    dependencies.push(formatMavenDep({ groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-data-redis', scope: null }));
  }

  if (flags.useKafka) {
    dependencies.push(formatMavenDep({ groupId: 'org.springframework.kafka', artifactId: 'spring-kafka', scope: null }));
  }

  if (flags.useRabbitmq) {
    dependencies.push(formatMavenDep({ groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-amqp', scope: null }));
  }

  if (flags.useSwagger) {
    dependencies.push(formatMavenDep({ groupId: 'org.springdoc', artifactId: 'springdoc-openapi-starter-webmvc-ui', version: '2.6.0', scope: null }));
  }

  if (flags.useAuth) {
    dependencies.push(formatMavenDep({ groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-security', scope: null }));
    dependencies.push(formatMavenDep({ groupId: 'io.jsonwebtoken', artifactId: 'jjwt-api', version: '0.12.6', scope: null }));
    dependencies.push(formatMavenDep({ groupId: 'io.jsonwebtoken', artifactId: 'jjwt-impl', version: '0.12.6', scope: 'runtime' }));
    dependencies.push(formatMavenDep({ groupId: 'io.jsonwebtoken', artifactId: 'jjwt-jackson', version: '0.12.6', scope: 'runtime' }));
  }

  if (flags.useTests) {
    devDependencies.push(formatMavenDep({ groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-test', scope: 'test' }));
    devDependencies.push(formatMavenDep({ groupId: 'org.testcontainers', artifactId: 'testcontainers', version: '1.20.0', scope: 'test' }));
    devDependencies.push(formatMavenDep({ groupId: 'org.testcontainers', artifactId: 'junit-jupiter', version: '1.20.0', scope: 'test' }));
    if (flags.dbPostgres) devDependencies.push(formatMavenDep({ groupId: 'org.testcontainers', artifactId: 'postgresql', version: '1.20.0', scope: 'test' }));
    if (flags.dbMysql) devDependencies.push(formatMavenDep({ groupId: 'org.testcontainers', artifactId: 'mysql', version: '1.20.0', scope: 'test' }));
  }

  if (flags.useCheckstyle) {
    plugins.push(formatMavenPlugin({ groupId: 'org.apache.maven.plugins', artifactId: 'maven-checkstyle-plugin', version: '3.5.0' }));
  }

  return { dependencies, devDependencies, plugins };
}

function resolveScripts(flags) {
  const scripts = {};

  if (flags.useDocker) {
    scripts['infra:up'] = 'docker compose up -d';
    scripts['infra:down'] = 'docker compose down';
  }

  if (flags.useCheckstyle) {
    scripts['checkstyle'] = 'mvn checkstyle:check';
  }

  if (flags.useTests) {
    scripts['test'] = 'mvn test';
    scripts['test:unit'] = 'mvn test';
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
