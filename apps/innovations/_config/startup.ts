import { container } from './inversify.config';

import {
  NOSQLConnectionServiceSymbol,
  NOSQLConnectionServiceType,
  SQLConnectionServiceSymbol,
  SQLConnectionServiceType
} from '@innovations/shared/services';


export const startup = async (): Promise<void> => {

  console.log('Initializing Innovations app function');

  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);
  const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);

  try {

    await sqlConnectionService.init();
    await noSqlConnectionService.init();

    console.log('Initialization complete');

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Innovations app function was UNABLE to start');
    console.error(error);

  }

}
