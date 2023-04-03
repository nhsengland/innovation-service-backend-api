import { inject, injectable } from 'inversify';
import type { DataSource } from 'typeorm';

import { GenericErrorsEnum, ServiceUnavailableError } from '../../errors';
import { SQLProviderSymbol, SQLProviderType } from '../interfaces';


@injectable()
export class SQLConnectionService {
  private connection: DataSource;

  constructor(
    @inject(SQLProviderSymbol) public readonly sqlProvider: SQLProviderType
  ) {}

  getConnection(): DataSource {
    if (!this.connection) {
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, {message: 'SQL Connection is not initialized'});
    }
    return this.connection;
  }

  setConnection(conection: DataSource): void {
    this.connection = conection;
  }

}
