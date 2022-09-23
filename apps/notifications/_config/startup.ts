import { container } from './inversify.config';

import { SQLConnectionServiceType, SQLConnectionServiceSymbol } from '@notifications/shared/services'


export const startup = async (): Promise<void> => {

  console.log('Initializing Notifications app function');

  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);

  try {

    await sqlConnectionService.init();

    console.log('Initialization complete');

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Notifications app function was UNABLE to start');
    console.error(error);

  }

}
