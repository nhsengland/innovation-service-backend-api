import { container } from '@users/shared/config/inversify.config';

import fs from 'fs';
import { join } from 'path';
import YAML from 'yaml';

import { HttpServiceSymbol, HttpServiceType, NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType, SQLConnectionServiceSymbol, SQLConnectionServiceType } from '@users/shared/services';

import {
  NotificationsServiceSymbol,
  NotificationsServiceType,
  OrganisationsServiceSymbol, OrganisationsServiceType,
  StatisticsServiceSymbol,
  StatisticsServiceType,
  SurveyServiceSymbol, SurveyServiceType,
  TermsOfUseServiceSymbol, TermsOfUseServiceType,
  UsersServiceSymbol, UsersServiceType
} from '../_services/interfaces';
import { OrganisationsService } from '../_services/organisations.service';
import { SurveyService } from '../_services/survey.service';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';

import { NotificationsService } from '../_services/notifications.service';
import { StatisticsService } from '../_services/statistics.service';

// Specific inversify container configuration
container.bind<OrganisationsServiceType>(OrganisationsServiceSymbol).to(OrganisationsService).inSingletonScope();
container.bind<SurveyServiceType>(SurveyServiceSymbol).to(SurveyService).inSingletonScope();
container.bind<TermsOfUseServiceType>(TermsOfUseServiceSymbol).to(TermsOfUseService).inSingletonScope();
container.bind<UsersServiceType>(UsersServiceSymbol).to(UsersService).inSingletonScope();
container.bind<NotificationsServiceType>(NotificationsServiceSymbol).to(NotificationsService).inSingletonScope();
container.bind<StatisticsServiceType>(StatisticsServiceSymbol).to(StatisticsService).inSingletonScope();

export { container };
export const startup = async (): Promise<void> => {

  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);
  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);
  const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);

  try {

    console.group('Initializing Users app function:');

    await sqlConnectionService.init();
    await noSqlConnectionService.init();

    console.log('Initialization complete');
    console.groupEnd();


    if (process.env['LOCAL_MODE'] ?? false) {

      console.group('Generating documentation...');

      const response = await httpService.getHttpInstance().get(`http://localhost:7074/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(`${join(__dirname, '../../../..')}/apps/users/.apim/swagger-test.yaml`, YAML.stringify(response.data))
      console.log('Documentation generated successfully');
      console.groupEnd();

    }

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Users app function was UNABLE to start');
    console.error(error);

  }

}

void startup();