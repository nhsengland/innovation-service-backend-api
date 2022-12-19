import { container } from '@admin/shared/config/inversify.config';

import fs from 'fs';
import { join } from 'path';
import YAML from 'yaml';

import {
  HttpServiceSymbol,
  HttpServiceType,
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@admin/shared/services';

import { OrganisationsService } from '../_services/organisations.service';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';
import {
  TermsOfUseServiceSymbol, TermsOfUseServiceType,
  OrganisationsServiceType, OrganisationsServiceSymbol, UsersServiceSymbol, UsersServiceType
} from '../_services/interfaces';


container.bind<TermsOfUseServiceType>(TermsOfUseServiceSymbol).to(TermsOfUseService).inSingletonScope();
container.bind<OrganisationsServiceType>(OrganisationsServiceSymbol).to(OrganisationsService).inSingletonScope();
container.bind<UsersServiceType>(UsersServiceSymbol).to(UsersService).inSingletonScope();

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