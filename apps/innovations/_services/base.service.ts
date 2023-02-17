import { injectable } from 'inversify';
import type { AxiosInstance } from 'axios';
import type { Mongoose } from 'mongoose';
import type { DataSource } from 'typeorm';

import {
  HttpServiceSymbol, HttpServiceType,
  LoggerServiceSymbol, LoggerServiceType,
  NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType,
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@innovations/shared/services';

import container from '../_config/init'


@injectable()
export class BaseService {

  http: AxiosInstance;
  logger: LoggerServiceType;
  noSqlConnection: Mongoose;
  sqlConnection: DataSource;

  constructor() {

    this.http = container.get<HttpServiceType>(HttpServiceSymbol).getHttpInstance();
    this.logger = container.get<LoggerServiceType>(LoggerServiceSymbol);
    this.noSqlConnection = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol).getConnection();
    this.sqlConnection = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol).getConnection();

  }

}
