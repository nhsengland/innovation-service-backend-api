import { join } from 'path';
import * as dotenv from 'dotenv';

import type { DataSourceOptions } from 'typeorm';

import { TypeORMCustomStrategy } from './custom-strategy.config';

import { GENERAL_ENTITIES, INNOVATION_ENTITIES, ORGANISATION_ENTITIES, USER_ENTITIES, VIEW_ENTITIES } from '../../entities';


dotenv.config();


if (!process.env['DB_HOST']) {
  console.error('DB connection undefined. Please, make sure environment variables are in place');
}


export const NOSQLDB_DEFAULT_CONNECTION = Object.freeze({
  host: `mongodb://${process.env['COSMOSDB_ACCOUNT']}:${escape(process.env['COSMOSDB_KEY'] || '')}@${process.env['COSMOSDB_HOST']}:${process.env['COSMOSDB_PORT']}/${process.env['COSMOSDB_DB']}?ssl=true&retryWrites=false`
});

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
      trustServerCertificate: true
    }
  },
  cli: { migrationsDir: `${join(__dirname, '..', '..')}/data-access/migrations` }
});

export const SQLDB_TESTS_CONNECTION: DataSourceOptions = Object.freeze({
  name: 'tests',
  type: 'mssql',
  host: process.env['DB_TESTS_HOST'] || '',
  username: process.env['DB_TESTS_USER'] || '',
  password: process.env['DB_TESTS_PWD'] || '',
  database: process.env['DB_TESTS_NAME'] || '',
  entities: [...GENERAL_ENTITIES, ...INNOVATION_ENTITIES, ...ORGANISATION_ENTITIES, ...USER_ENTITIES],
  namingStrategy: new TypeORMCustomStrategy(),
  synchronize: false,
  extra: { options: { enableArithAbort: true, trustServerCertificate: true } },
  migrations: [`${join(__dirname, '..', '..')}/data-access/migrations/*.ts`],
  migrationsTableName: 'Migrations',
  cli: { migrationsDir: `${join(__dirname, '..', '..')}/data-access/migrations` }
});
