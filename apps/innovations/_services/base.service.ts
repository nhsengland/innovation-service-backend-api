import { injectable } from 'inversify';
import type { AxiosInstance } from 'axios';
import type { Mongoose } from 'mongoose';
import type { DataSource } from 'typeorm';

import {
  HttpServiceSymbol, HttpServiceType,
  LoggerServiceSymbol, LoggerServiceType,
  NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType, SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@innovations/shared/services';


import { container } from '../_config'

@injectable()
export class BaseService {

  noSqlConnection: Mongoose;
  logger: LoggerServiceType;
  http: AxiosInstance;
  sqlConnection: DataSource;

  constructor() {

    const httpService = container.get<HttpServiceType>(HttpServiceSymbol);
    const loggerService = container.get<LoggerServiceType>(LoggerServiceSymbol);
    const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);
    const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);


    this.noSqlConnection = noSqlConnectionService.getConnection();
    this.http = httpService.getHttpInstance();
    this.logger = loggerService;
    this.sqlConnection = sqlConnectionService.getConnection();
  }

}
