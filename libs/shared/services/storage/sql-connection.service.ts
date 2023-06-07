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

  setConnection(conection: DataSource): void {
    this.connection = conection;
  }

  async destroy(): Promise<void> {
    await this.connection?.destroy();
  }
}
