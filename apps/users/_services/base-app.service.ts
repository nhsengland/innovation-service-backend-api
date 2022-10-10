import { injectable } from 'inversify';
import type { AxiosInstance } from 'axios';
import type { DataSource } from 'typeorm';

import {
  HttpServiceSymbol, HttpServiceType,
  LoggerServiceSymbol, LoggerServiceType,
  SQLConnectionServiceType, SQLConnectionServiceSymbol,
} from '@users/shared/services';

import { container } from '../_config';


@injectable()
export class BaseAppService {

  logger: LoggerServiceType;
  http: AxiosInstance;
  sqlConnection: DataSource;

  constructor() {

    const loggerService = container.get<LoggerServiceType>(LoggerServiceSymbol);
    const httpService = container.get<HttpServiceType>(HttpServiceSymbol);

    this.sqlConnection = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol).getConnection();

    this.http = httpService.getHttpInstance();
    this.logger = loggerService;

  }

}
