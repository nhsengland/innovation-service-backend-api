import { container } from '@admin/shared/config/inversify.config';

import fs from 'fs';
import { join } from 'path';
import YAML from 'yaml';

import {
  HttpServiceSymbol,
  HttpServiceType,
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@admin/shared/services';

import { AdminService } from '../_services/admin.service';
import { AdminTermsOfUseService } from '../_services/admin-terms-of-use.service';
import { AdminServiceSymbol, AdminServiceType, AdminTermsOfUseServiceSymbol, AdminTermsOfUseServiceType } from '../_services/interfaces';

container.bind<AdminServiceType>(AdminServiceSymbol).to(AdminService).inSingletonScope();
container.bind<AdminTermsOfUseServiceType>(AdminTermsOfUseServiceSymbol).to(AdminTermsOfUseService).inSingletonScope();

export const startup = async (): Promise<void> => {

  console.log('Initializing Admin app function');

  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);
  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);

  try {

    await sqlConnectionService.init();

    console.log('Initialization complete');

    if (process.env['LOCAL_MODE'] ?? false) {

      console.group('Generating documentation...');

      const response = await httpService.getHttpInstance().get(`http://localhost:7071/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(`${join(__dirname, '../../../..')}/apps/admin/.apim/swagger.yaml`, YAML.stringify(response.data))
      console.log('Documentation generated successfully');
      console.groupEnd();

    }

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Admin app function was UNABLE to start');
    console.error(error);

  }

}

export { container };
void startup();