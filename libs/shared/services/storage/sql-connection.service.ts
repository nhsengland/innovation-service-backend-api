import { injectable } from 'inversify';
import { DataSource } from 'typeorm';

import { SQLDB_DEFAULT_CONNECTION } from '../../config';
import { ServiceUnavailableError, GenericErrorsEnum } from '../../errors';


@injectable()
export class SQLConnectionService {

  private connection: DataSource;

  async init() {

    this.connection = new DataSource(SQLDB_DEFAULT_CONNECTION);

    try {

      await this.connection.initialize();
      console.log('SQL Connection successfully created.');

    } catch (error: any) {

      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, { details: error });

    };

    return this;

  }

  getConnection(): DataSource {
    return this.connection;
  }

}
