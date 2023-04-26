import { injectable } from 'inversify';
import type { DataSource } from 'typeorm';

import {
  LoggerServiceSymbol,
  LoggerServiceType,
  SQLConnectionServiceSymbol,
  SQLConnectionServiceType,
} from '@notifications/shared/services';

import { container } from '../_config';

@injectable()
export class BaseService {
  private _logger: LoggerServiceType;
  get logger(): LoggerServiceType {
    if (!this._logger) {
      this._logger = container.get<LoggerServiceType>(LoggerServiceSymbol);
    }
    return this._logger;
  }

  private _sqlConnection: DataSource;
  get sqlConnection(): DataSource {
    if (!this._sqlConnection) {
      this._sqlConnection = container
        .get<SQLConnectionServiceType>(SQLConnectionServiceSymbol)
        .getConnection();
    }
    return this._sqlConnection;
  }

  constructor() {}
}
