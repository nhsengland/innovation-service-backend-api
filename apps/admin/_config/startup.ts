import fs from 'fs';
import { join } from 'path';
import YAML from 'yaml';

import { container } from '@admin/shared/config/inversify.config';

import {
  HttpServiceSymbol, HttpServiceType,
  NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType
} from '@admin/shared/services';

import { AnnouncementsService } from '../_services/announcements.service';
import { OrganisationsService } from '../_services/organisations.service';
import { StatisticsService } from '../_services/statistics.service';
import { SYMBOLS } from '../_services/symbols';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';
import { ValidationService } from '../_services/validation.service';


// Specific inversify container configuration.
container.bind<OrganisationsService>(SYMBOLS.OrganisationsService).to(OrganisationsService).inSingletonScope();
container.bind<StatisticsService>(SYMBOLS.StatisticsService).to(StatisticsService).inSingletonScope();
container.bind<TermsOfUseService>(SYMBOLS.TermsOfUseService).to(TermsOfUseService).inSingletonScope();
container.bind<UsersService>(SYMBOLS.UsersService).to(UsersService).inSingletonScope();
container.bind<ValidationService>(SYMBOLS.ValidationService).to(ValidationService).inSingletonScope();
container.bind<AnnouncementsService>(SYMBOLS.AnnouncementsService).to(AnnouncementsService).inSingletonScope();


export const startup = async (): Promise<void> => {

  console.log('Initializing Admin app function');

  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);
  const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);

  try {

    console.group('Initializing Admin app function:');

    await noSqlConnectionService.init();

    console.log('Initialization complete');
    console.groupEnd();

    if (process.env['LOCAL_MODE'] ?? false) {

      console.group('Generating documentation...');

      const response = await httpService.getHttpInstance().get(`http://localhost:7071/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(`${join(__dirname, '../../../..')}/apps/admin/.apim/swagger.yaml`, YAML.stringify(response.data));
      console.log('Documentation generated successfully');
      console.groupEnd();

    }

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Admin app function was UNABLE to start');
    console.error(error);

  }

};

void startup();

export { container };
