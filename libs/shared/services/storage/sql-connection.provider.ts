import type { interfaces } from 'inversify';
import { DataSource } from 'typeorm';
import { SQLDB_DEFAULT_CONNECTION, SQLDB_TESTS_CONNECTION } from '../../config';
import { GenericErrorsEnum, ServiceUnavailableError } from '../../errors';

export type SqlProvider = () => Promise<DataSource>;

let connection: DataSource;
export const sqlProvider = (_context: interfaces.Context) => {
  return async (): Promise<DataSource> => {
    if (!connection) {
      connection =
        process.env['NODE_ENV'] === 'test'
          ? new DataSource(SQLDB_TESTS_CONNECTION)
          : new DataSource(SQLDB_DEFAULT_CONNECTION);
      try {
        await connection.initialize();
      } catch (error: any) {
        throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, {
          details: error
        });
      }
    }
    return connection;
  };
};
