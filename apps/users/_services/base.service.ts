import { injectable } from 'inversify';
import type { DataSource } from 'typeorm';

import {
  LoggerServiceSymbol, LoggerServiceType,
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@users/shared/services';

import container from '../_config/init';


@injectable()
export class BaseService {

  logger: LoggerServiceType;
  sqlConnection: DataSource;

  constructor() {

    this.logger = container.get<LoggerServiceType>(LoggerServiceSymbol);
    this.sqlConnection = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol).getConnection();

  }

}
