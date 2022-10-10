import { container } from './inversify.config';

import { SQLConnectionServiceType, SQLConnectionServiceSymbol } from '@users/shared/services'


export const startup = async (): Promise<void> => {

  console.log('Initializing Users app function');

  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);

  try {

    await sqlConnectionService.init();

    console.log('Initialization complete');

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Users app function was UNABLE to start');
    console.error(error);

  }

}
