import { injectable } from 'inversify';
import { DataSource } from 'typeorm';

import { SQLDB_DEFAULT_CONNECTION, SQLDB_TESTS_CONNECTION } from '../../config';
import { GenericErrorsEnum, ServiceUnavailableError } from '../../errors';

@injectable()
export class SQLConnectionService {
  private _connection: DataSource;

  constructor() {
    /*
    const connection =
      process.env['NODE_ENV'] === 'test'
        ? new DataSource(SQLDB_TESTS_CONNECTION)
        : new DataSource(SQLDB_DEFAULT_CONNECTION);

    return connection.initialize();
    */
    this._connection =
      process.env['NODE_ENV'] === 'test'
        ? new DataSource(SQLDB_TESTS_CONNECTION)
        : new DataSource(SQLDB_DEFAULT_CONNECTION);

    this._connection.initialize();
  }

  getConnection(): DataSource {
    if (!this._connection.isInitialized) {
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, {
        message: 'SQL Connection is not initialized'
      });
    }
    return this._connection;
  }

  async destroy(): Promise<void> {
    if (this._connection.isInitialized) {
      await this._connection.destroy();
    }
  }
}
