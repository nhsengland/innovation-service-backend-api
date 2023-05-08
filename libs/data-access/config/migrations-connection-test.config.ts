import { DataSource } from 'typeorm';
import { join } from 'path';

import { SQLDB_TESTS_CONNECTION } from '../../shared/config';

if (!process.env['DB_TESTS_HOST'] || !process.env['ADMIN_OID']) {
  throw new Error('ENV variables missing! Please, make sure environment variables are in place');
}

const SQLDB_MIGRATIONS_CONNECTION = new DataSource({
  ...SQLDB_TESTS_CONNECTION,
  name: 'migrations',
  migrations: [`${join(__dirname, '..')}/migrations/*.ts`],
  migrationsTableName: 'Migrations'
});

export default SQLDB_MIGRATIONS_CONNECTION;
