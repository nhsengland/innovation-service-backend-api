import { SQLDB_TESTS_CONNECTION } from '../../config/typeorm/connections.config';
import { injectable } from 'inversify';
import { DataSource } from 'typeorm';

import { GenericErrorsEnum, ServiceUnavailableError } from '../../errors';


@injectable()
export class SQLConnectionTestService {

  private connection: DataSource;

  async init(): Promise<this> {

    this.connection = new DataSource(SQLDB_TESTS_CONNECTION);

    try {

      await this.connection.initialize();
      console.log('SQL Connection successfully created.');

    } catch (error: any) {

      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, { details: error });

    }

    return this;

  }

  getConnection(): DataSource {
    return this.connection;
  }

}
