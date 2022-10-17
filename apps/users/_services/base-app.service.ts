import { injectable } from 'inversify';
import type { DataSource } from 'typeorm';

import { LoggerServiceSymbol, LoggerServiceType, SQLConnectionServiceType, SQLConnectionServiceSymbol } from '@users/shared/services';

import { container } from '../_config';


@injectable()
export class BaseAppService {

  logger: LoggerServiceType;
  sqlConnection: DataSource;

  constructor() {

    this.logger = container.get<LoggerServiceType>(LoggerServiceSymbol)
    this.sqlConnection = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol).getConnection();

  }

}
