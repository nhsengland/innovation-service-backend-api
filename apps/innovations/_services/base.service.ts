import { injectable } from 'inversify';
import type { Mongoose } from 'mongoose';
import type { DataSource } from 'typeorm';

import {
  LoggerServiceSymbol, LoggerServiceType,
  NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType,
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@innovations/shared/services';

import container from '../_config/init';


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
    if(!this._sqlConnection) {
      this._sqlConnection = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol).getConnection();
    }
    return this._sqlConnection;
  }

  private _noSqlConnection: Mongoose;
  get noSqlConnection(): Mongoose {
    if(!this._noSqlConnection) {
      this._noSqlConnection = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol).getConnection();
    }
    return this._noSqlConnection;
  }
  
  constructor() {}

}
