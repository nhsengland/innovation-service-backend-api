import { injectable } from 'inversify';
import type { DataSource } from 'typeorm';

import type { LoggerService, SQLConnectionService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';

import container from '../_config/init';

@injectable()
export class BaseService {
  private _logger: LoggerService;
  get logger(): LoggerService {
    if (!this._logger) {
      this._logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);
    }
    return this._logger;
  }

  private _sqlConnection: DataSource;
  get sqlConnection(): DataSource {
    if (!this._sqlConnection) {
      this._sqlConnection = container.get<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService).getConnection();
    }
    return this._sqlConnection;
  }

  constructor() {}
}
