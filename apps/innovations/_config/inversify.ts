import { container } from '@innovations/shared/config/inversify.config';

import {
  InnovationActionsServiceSymbol, InnovationActionsServiceType,
  InnovationAssessmentsServiceSymbol, InnovationAssessmentsServiceType,
  InnovationFileServiceSymbol, InnovationFileServiceType,
  InnovationSectionsServiceSymbol, InnovationSectionsServiceType,
  InnovationSupportsServiceSymbol, InnovationSupportsServiceType,
  InnovationThreadsServiceSymbol, InnovationThreadsServiceType,
  InnovationTransferServiceSymbol, InnovationTransferServiceType,
  InnovationsServiceSymbol, InnovationsServiceType,
  PDFServiceSymbol, PDFServiceType,
  StatisticsServiceSymbol, StatisticsServiceType
} from '../_services/interfaces';

import { InnovationActionsService } from '../_services/innovation-actions.service';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import { InnovationFileService } from '../_services/innovation-file.service';
import { InnovationSectionsService } from '../_services/innovation-sections.service';
import { InnovationSupportsService } from '../_services/innovation-supports.service';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import { InnovationTransferService } from '../_services/innovation-transfer.service';
import { InnovationsService } from '../_services/innovations.service';
import { PDFService } from '../_services/pdf.service';
import { StatisticsService } from '../_services/statistics.service';


// Specific inversify container configuration.
container.bind<InnovationActionsServiceType>(InnovationActionsServiceSymbol).to(InnovationActionsService).inSingletonScope();
container.bind<InnovationAssessmentsServiceType>(InnovationAssessmentsServiceSymbol).to(InnovationAssessmentsService).inSingletonScope();
container.bind<InnovationFileServiceType>(InnovationFileServiceSymbol).to(InnovationFileService).inSingletonScope();
container.bind<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol).to(InnovationSectionsService).inSingletonScope();
container.bind<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol).to(InnovationSupportsService).inSingletonScope();
container.bind<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol).to(InnovationThreadsService).inSingletonScope();
container.bind<InnovationTransferServiceType>(InnovationTransferServiceSymbol).to(InnovationTransferService).inSingletonScope();
container.bind<InnovationsServiceType>(InnovationsServiceSymbol).to(InnovationsService).inSingletonScope();
container.bind<PDFServiceType>(PDFServiceSymbol).to(PDFService).inSingletonScope();
container.bind<StatisticsServiceType>(StatisticsServiceSymbol).to(StatisticsService).inSingletonScope();

export { container };
