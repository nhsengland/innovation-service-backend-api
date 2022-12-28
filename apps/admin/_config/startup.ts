import { container } from '@admin/shared/config/inversify.config';

import fs from 'fs';
import { join } from 'path';
import YAML from 'yaml';

import {
  CacheServiceSymbol,
  CacheServiceType,
  HttpServiceSymbol,
  HttpServiceType,
  NOSQLConnectionServiceSymbol,
  NOSQLConnectionServiceType,
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@admin/shared/services';

import { 
  OrganisationsServiceSymbol, OrganisationsServiceType, TermsOfUseServiceSymbol, TermsOfUseServiceType,
  UsersServiceSymbol, UsersServiceType, ValidationServiceSymbol, ValidationServiceType } from '../_services/interfaces';
import { OrganisationsService } from '../_services/organisations.service';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';
import { ValidationService } from '../_services/validation.service';


container.bind<TermsOfUseServiceType>(TermsOfUseServiceSymbol).to(TermsOfUseService).inSingletonScope();
container.bind<OrganisationsServiceType>(OrganisationsServiceSymbol).to(OrganisationsService).inSingletonScope();
container.bind<UsersServiceType>(UsersServiceSymbol).to(UsersService).inSingletonScope();
container.bind<ValidationServiceType>(ValidationServiceSymbol).to(ValidationService).inSingletonScope();

export const startup = async (): Promise<void> => {

  console.log('Initializing Admin app function');

  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);
  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);
  const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);
  const cacheService = container.get<CacheServiceType>(CacheServiceSymbol);

  try {

    await sqlConnectionService.init();
    await noSqlConnectionService.init();
    await cacheService.init();

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