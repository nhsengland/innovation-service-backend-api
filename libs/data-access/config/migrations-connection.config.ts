import { join } from 'path';
import { DataSource } from 'typeorm';

import type { SqlServerConnectionOptions } from 'typeorm/driver/sqlserver/SqlServerConnectionOptions';
import { SQLDB_DEFAULT_CONNECTION } from '../../shared/config';

if (!process.env['DB_HOST'] || !process.env['ADMIN_OID']) {
  throw new Error('ENV variables missing! Please, make sure environment variables are in place');
}

const SQLDB_MIGRATIONS_CONNECTION = new DataSource({
  ...SQLDB_DEFAULT_CONNECTION,
  requestTimeout: 900000, // Increase timeout for migrations to 15 min at least for adding the innovation share logs
  name: 'migrations',
  migrations: [`${join(__dirname, '..')}/migrations/*.ts`],
  migrationsTableName: 'Migrations'
} as SqlServerConnectionOptions);

export default SQLDB_MIGRATIONS_CONNECTION;
