import { DataSource } from 'typeorm';
import { join } from 'path';

import { SQLDB_DEFAULT_CONNECTION } from '../../shared/config';

if (!process.env['DB_HOST'] || !process.env['ADMIN_OID']) {
  throw new Error('ENV variables missing! Please, make sure environment variables are in place');
}

const SQLDB_SEEDS_CONNECTION = new DataSource({
  ...SQLDB_DEFAULT_CONNECTION,
  name: 'seeds',
  migrations: [`${join(__dirname, '..')}/seeds/*.ts`],
  migrationsTableName: 'Seeds',
});

export default SQLDB_SEEDS_CONNECTION;
