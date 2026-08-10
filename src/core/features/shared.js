'use strict';

const ORM_DATABASE_SUPPORT = {
  prisma: ['postgres', 'mysql', 'sqlite', 'mongo'],
  typeorm: ['postgres', 'mysql', 'sqlite', 'mongo'],
  mongoose: ['mongo'],
  gorm: ['postgres', 'mysql', 'sqlite'],
  lucid: ['postgres', 'mysql', 'sqlite'],
  eloquent: ['postgres', 'mysql', 'sqlite'],
  django: ['postgres', 'mysql', 'sqlite'],
  sqlalchemy: ['postgres', 'mysql', 'sqlite'],
  tortoise: ['postgres', 'mysql', 'sqlite'],
  sqlx: ['postgres', 'mysql', 'sqlite'],
  diesel: ['postgres', 'mysql', 'sqlite'],
  'sea-orm': ['postgres', 'mysql', 'sqlite'],
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

module.exports = { ORM_DATABASE_SUPPORT, DATABASE_LABELS, DEFAULT_PORTS };
