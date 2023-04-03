import { injectable } from 'inversify';
import { connect, Mongoose } from 'mongoose';

import { NOSQLDB_DEFAULT_CONNECTION } from '../../config';

// TODO: This will be removed soon, remove anything related to survey / sts

@injectable()
export class NOSQLConnectionService {

  private connection: Mongoose;

  async init(): Promise<void> {

    if (!this.connection) {

      try {
        this.connection = await connect(NOSQLDB_DEFAULT_CONNECTION.host);
        console.log('NO SQL Connection successfully created.');
      } catch (error) {
        console.error('NO SQL Connection ERROR', error);
      }
    }

  }
  

  async closeConnection(): Promise<void> {

    // TODO: Not tested yet!
    if (this.connection) {
      await this.connection.disconnect();
    }

  }


  getConnection(): Mongoose {
    return this.connection;
  }

}
