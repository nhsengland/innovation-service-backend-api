import { container } from '@admin/shared/config/inversify.config';

import {
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@admin/shared/services';

import { AdminServiceSymbol, AdminServiceType } from '../_services/interfaces';
import { AdminService } from '../_services/admin.service';

container.bind<AdminServiceType>(AdminServiceSymbol).to(AdminService).inSingletonScope();

export const startup = async (): Promise<void> => {

  console.log('Initializing Admin app function');

  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);

  try {

    await sqlConnectionService.init();

    console.log('Initialization complete');

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Admin app function was UNABLE to start');
    console.error(error);

  }

}

export { container };
void startup();