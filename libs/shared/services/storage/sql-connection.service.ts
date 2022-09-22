import { injectable } from 'inversify';
import { DataSource } from 'typeorm';

import { SQLDB_DEFAULT_CONNECTION, ServiceUnavailableError } from '../../config';
import { GenericErrorsEnum } from '../../enums/error.enums';


@injectable()
export class SQLConnectionService {

  private connection: DataSource;


  constructor() {

    this.connection = new DataSource(SQLDB_DEFAULT_CONNECTION);

    this.connection.initialize().then(() => {
      console.log('SQL Connection successfully created.');
    }).catch((error) => {
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, { details: error });
    })

  }

  getConnection(): DataSource {
    return this.connection;
  }

}
