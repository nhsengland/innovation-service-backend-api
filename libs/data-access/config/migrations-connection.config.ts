import { join } from 'path';
import { DataSource } from 'typeorm';

import { SQLDB_DEFAULT_CONNECTION } from '../../shared/config';

if (!process.env['DB_HOST'] || !process.env['ADMIN_OID']) {
  throw new Error('ENV variables missing! Please, make sure environment variables are in place');
}

const SQLDB_MIGRATIONS_CONNECTION = new DataSource({
  ...SQLDB_DEFAULT_CONNECTION,
  name: 'migrations',
  migrations: [`${join(__dirname, '..')}/migrations/*.ts`],
  migrationsTableName: 'Migrations',
});

export default SQLDB_MIGRATIONS_CONNECTION;
