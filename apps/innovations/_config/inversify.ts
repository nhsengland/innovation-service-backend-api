import { container } from '@innovations/shared/config/inversify.config';

import { InnovationActionsService } from '../_services/innovation-actions.service';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
import { InnovationExportRequestService } from '../_services/innovation-export-request.service';
import { InnovationFileService } from '../_services/innovation-file.service';
import { InnovationSectionsService } from '../_services/innovation-sections.service';
import { InnovationSupportsService } from '../_services/innovation-supports.service';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import { InnovationTransferService } from '../_services/innovation-transfer.service';
import { InnovationsService } from '../_services/innovations.service';
import { PDFService } from '../_services/pdf.service';
import { StatisticsService } from '../_services/statistics.service';
import SYMBOLS from '../_services/symbols';

// Specific inversify container configuration.
container
  .bind<InnovationActionsService>(SYMBOLS.InnovationActionsService)
  .to(InnovationActionsService)
  .inSingletonScope();
container
  .bind<InnovationAssessmentsService>(SYMBOLS.InnovationAssessmentsService)
  .to(InnovationAssessmentsService)
  .inSingletonScope();
container.bind<InnovationFileService>(SYMBOLS.InnovationFileService).to(InnovationFileService).inSingletonScope();
container
  .bind<InnovationSectionsService>(SYMBOLS.InnovationSectionsService)
  .to(InnovationSectionsService)
  .inSingletonScope();
container
  .bind<InnovationSupportsService>(SYMBOLS.InnovationSupportsService)
  .to(InnovationSupportsService)
  .inSingletonScope();
container
  .bind<InnovationThreadsService>(SYMBOLS.InnovationThreadsService)
  .to(InnovationThreadsService)
  .inSingletonScope();
container
  .bind<InnovationTransferService>(SYMBOLS.InnovationTransferService)
  .to(InnovationTransferService)
  .inSingletonScope();
container
  .bind<InnovationCollaboratorsService>(SYMBOLS.InnovationCollaboratorsService)
  .to(InnovationCollaboratorsService)
  .inSingletonScope();
container
  .bind<InnovationExportRequestService>(SYMBOLS.InnovationExportRequestService)
  .to(InnovationExportRequestService)
  .inSingletonScope();
container.bind<InnovationsService>(SYMBOLS.InnovationsService).to(InnovationsService).inSingletonScope();
container.bind<PDFService>(SYMBOLS.PDFService).to(PDFService).inSingletonScope();
container.bind<StatisticsService>(SYMBOLS.StatisticsService).to(StatisticsService).inSingletonScope();

export { container };
