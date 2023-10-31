import * as dotenv from 'dotenv';
import { join } from 'path';

import type { DataSourceOptions } from 'typeorm';

import { TypeORMCustomStrategy } from './custom-strategy.config';

import {
  GENERAL_ENTITIES,
  INNOVATION_ENTITIES,
  ORGANISATION_ENTITIES,
  USER_ENTITIES,
  VIEW_ENTITIES
} from '../../entities';

dotenv.config();

if (!process.env['DB_HOST']) {
  console.error('DB connection undefined. Please, make sure environment variables are in place');
}

export const SQLDB_DEFAULT_CONNECTION: DataSourceOptions = Object.freeze({
  name: 'default',
  type: 'mssql',
  host: process.env['DB_HOST'] || '',
  username: process.env['DB_USER'] || '',
  password: process.env['DB_PWD'] || '',
  database: process.env['DB_NAME'] || '',
  entities: [...GENERAL_ENTITIES, ...INNOVATION_ENTITIES, ...ORGANISATION_ENTITIES, ...USER_ENTITIES, ...VIEW_ENTITIES],
  namingStrategy: new TypeORMCustomStrategy(),
  synchronize: false,
  extra: {
    options: {
      enableArithAbort: true,
      trustServerCertificate: true,
      useUTC: true
    }
  },
  cli: { migrationsDir: `${join(__dirname, '..', '..')}/data-access/migrations` },
  logging: process.env['DB_LOGGING'] === 'true'
});

export const SQLDB_TESTS_CONNECTION: DataSourceOptions = Object.freeze({
  name: 'default',
  type: 'mssql',
  host: process.env['DB_TESTS_HOST'] || '',
  username: process.env['DB_TESTS_USER'] || '',
  password: process.env['DB_TESTS_PWD'] || '',
  database: process.env['DB_TESTS_NAME'] || '',
  entities: [...GENERAL_ENTITIES, ...INNOVATION_ENTITIES, ...ORGANISATION_ENTITIES, ...USER_ENTITIES, ...VIEW_ENTITIES],
  namingStrategy: new TypeORMCustomStrategy(),
  synchronize: false,
  extra: { options: { enableArithAbort: true, trustServerCertificate: true, useUTC: true } },
  migrations: [`${join(__dirname, '..', '..')}/data-access/migrations/*.ts`],
  migrationsTableName: 'Migrations',
  cli: { migrationsDir: `${join(__dirname, '..', '..')}/data-access/migrations` }
  // logging: process.env['DB_LOGGING'] === 'true'
});
