import { container } from '@innovations/shared/config/inversify.config';

import fs from 'fs';
import { join } from 'path';
import YAML from 'yaml';

import {
  HttpServiceSymbol,
  HttpServiceType,
  NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType,
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@innovations/shared/services';

import {
  InnovationActionsServiceSymbol, InnovationActionsServiceType, InnovationAssessmentsServiceSymbol, InnovationAssessmentsServiceType, InnovationSectionsServiceSymbol, InnovationSectionsServiceType,
  InnovationsServiceSymbol, InnovationsServiceType, InnovationSupportsServiceSymbol, InnovationSupportsServiceType, InnovationThreadsServiceSymbol, InnovationThreadsServiceType, InnovationTransferServiceSymbol,
  InnovationTransferServiceType, PDFServiceSymbol, PDFServiceType, StatisticsServiceSymbol, StatisticsServiceType
} from '../_services/interfaces';

import { InnovationActionsService } from '../_services/innovation-actions.service';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import { InnovationSectionsService } from '../_services/innovation-sections.service';
import { InnovationSupportsService } from '../_services/innovation-supports.service';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import { InnovationTransferService } from '../_services/innovation-transfer.service';
import { InnovationsService } from '../_services/innovations.service';
import { PDFService } from '../_services/pdf.service';
import { StatisticsService } from '../_services/statistics.service';

// Specific inversify container configuration
container.bind<InnovationActionsServiceType>(InnovationActionsServiceSymbol).to(InnovationActionsService).inSingletonScope();
container.bind<InnovationAssessmentsServiceType>(InnovationAssessmentsServiceSymbol).to(InnovationAssessmentsService).inSingletonScope();
container.bind<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol).to(InnovationSectionsService).inSingletonScope();
container.bind<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol).to(InnovationSupportsService).inSingletonScope();
container.bind<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol).to(InnovationThreadsService).inSingletonScope();
container.bind<InnovationTransferServiceType>(InnovationTransferServiceSymbol).to(InnovationTransferService).inSingletonScope();
container.bind<InnovationsServiceType>(InnovationsServiceSymbol).to(InnovationsService).inSingletonScope();
container.bind<PDFServiceType>(PDFServiceSymbol).to(PDFService).inSingletonScope();
container.bind<StatisticsServiceType>(StatisticsServiceSymbol).to(StatisticsService).inSingletonScope();

export { container };
export const startup = async (): Promise<void> => {

  console.log('Initializing Innovations app function');

  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);
  const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);
  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);

  try {

    await sqlConnectionService.init();
    await noSqlConnectionService.init();

    console.log('Initialization complete');

    if (process.env['LOCAL_MODE'] ?? false) {

      console.group('Generating documentation...');

      const response = await httpService.getHttpInstance().get(`http://localhost:7072/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(`${join(__dirname, '../../../..')}/apps/innovations/.apim/swagger.yaml`, YAML.stringify(response.data))
      console.log('Documentation generated successfully');
      console.groupEnd();

    }

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Innovations app function was UNABLE to start');
    console.error(error);

  }

}

void startup();