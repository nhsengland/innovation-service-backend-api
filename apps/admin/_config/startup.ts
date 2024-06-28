import fs from 'fs';
import { join } from 'path';
import YAML from 'yaml';

import { container } from '@admin/shared/config/inversify.config';

import type { HttpService, LoggerService } from '@admin/shared/services';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { AnnouncementsService } from '../_services/announcements.service';
import { DemoService } from '../_services/demo.service';
import { OrganisationsService } from '../_services/organisations.service';
import { StatisticsService } from '../_services/statistics.service';
import { SYMBOLS } from '../_services/symbols';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';
import { ValidationService } from '../_services/validation.service';
import { SearchService } from '../_services/search.service';
import { SchemaService } from '../_services/schema.service';

// Specific inversify container configuration.
container.bind<OrganisationsService>(SYMBOLS.OrganisationsService).to(OrganisationsService).inSingletonScope();
container.bind<DemoService>(SYMBOLS.DemoService).to(DemoService).inSingletonScope();
container.bind<StatisticsService>(SYMBOLS.StatisticsService).to(StatisticsService).inSingletonScope();
container.bind<TermsOfUseService>(SYMBOLS.TermsOfUseService).to(TermsOfUseService).inSingletonScope();
container.bind<UsersService>(SYMBOLS.UsersService).to(UsersService).inSingletonScope();
container.bind<ValidationService>(SYMBOLS.ValidationService).to(ValidationService).inSingletonScope();
container.bind<AnnouncementsService>(SYMBOLS.AnnouncementsService).to(AnnouncementsService).inSingletonScope();
container.bind<SearchService>(SYMBOLS.SearchService).to(SearchService).inSingletonScope();
container.bind<SchemaService>(SYMBOLS.SchemaService).to(SchemaService).inSingletonScope();

export const startup = async (): Promise<void> => {
  const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);
  logger.log('Initializing Admin app function');

  const httpService = container.get<HttpService>(SHARED_SYMBOLS.HttpService);

  try {
    if (process.env['LOCAL_MODE'] ?? false) {
      console.group('Generating documentation...');

      const response = await httpService.getHttpInstance().get(`http://127.0.0.1:7071/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(
        `${join(__dirname, '../../../..')}/apps/admin/.apim/swagger.yaml`,
        YAML.stringify(response.data)
      );
      console.log('Documentation generated successfully');
      console.groupEnd();
    }
  } catch (error) {
    // TODO: Treat this error! Should we end the process?
    logger.error('Admin app function was UNABLE to start', { error });
  }
};

void startup();

export { container };
