import { inject, injectable } from 'inversify';
import type { DataSource } from 'typeorm';

import { GenericErrorsEnum, ServiceUnavailableError } from '../../errors';
import SHARED_SYMBOLS from '../symbols';
import type { SqlProvider } from './sql-connection.provider';

@injectable()
export class SQLConnectionService {
  private connection: DataSource;

  constructor(@inject(SHARED_SYMBOLS.SqlProvider) public readonly sqlProvider: SqlProvider) {}

  getConnection(): DataSource {
    if (!this.connection) {
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, {
        message: 'SQL Connection is not initialized'
      });
    }
    return this.connection;
  }

  setConnection(connection: DataSource): void {
    this.connection = connection;
  }

  async destroy(): Promise<void> {
    if (this.connection?.isInitialized) {
      await this.connection?.destroy();
    }
  }
}
