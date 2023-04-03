import type { interfaces } from 'inversify';
import { DataSource } from 'typeorm';
import { SQLDB_DEFAULT_CONNECTION, SQLDB_TESTS_CONNECTION } from '../../config';
import { GenericErrorsEnum, ServiceUnavailableError } from '../../errors';

export type SqlProvider = () => Promise<DataSource>;

let connection: DataSource;
export const sqlProvider = (_context: interfaces.Context) => {
  return async (): Promise<DataSource> => {
    if(!connection) {
      connection = process.env['JEST_WORKER_ID'] ? new DataSource(SQLDB_TESTS_CONNECTION) : new DataSource(SQLDB_DEFAULT_CONNECTION);
      try {
        await connection.initialize();
        console.log('SQL Connection successfully created.');
  
      } catch (error: any) {
        console.log(error);
        throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, { details: error });
      }
    }
    return connection;
  };
};