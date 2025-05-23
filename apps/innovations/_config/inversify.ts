import { container } from '@innovations/shared/config/inversify.config';

import SYMBOLS from '../_services/symbols';

import { AnalyticsService } from '../_services/analytics.service';
import { ExportFileService } from '../_services/export-file-service';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
import { InnovationDocumentService } from '../_services/innovation-document.service';
import { InnovationExportRequestService } from '../_services/innovation-export-request.service';
import { InnovationFileService } from '../_services/innovation-file.service';
import { InnovationSectionsService } from '../_services/innovation-sections.service';
import { InnovationSupportsService } from '../_services/innovation-supports.service';
import { InnovationTasksService } from '../_services/innovation-tasks.service';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import { InnovationTransferService } from '../_services/innovation-transfer.service';
import { InnovationsService } from '../_services/innovations.service';
import { SearchService } from '../_services/search.service';
import { StatisticsService } from '../_services/statistics.service';
import { SurveysService } from '../_services/surveys.service';
import { ValidationService } from '../_services/validation.service';

// Specific inversify container configuration.
container.bind<AnalyticsService>(SYMBOLS.AnalyticsService).to(AnalyticsService).inSingletonScope();
container.bind<InnovationTasksService>(SYMBOLS.InnovationTasksService).to(InnovationTasksService).inSingletonScope();
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
container
  .bind<InnovationDocumentService>(SYMBOLS.InnovationDocumentService)
  .to(InnovationDocumentService)
  .inSingletonScope();
container.bind<InnovationsService>(SYMBOLS.InnovationsService).to(InnovationsService).inSingletonScope();
container.bind<ExportFileService>(SYMBOLS.ExportFileService).to(ExportFileService).inSingletonScope();
container.bind<StatisticsService>(SYMBOLS.StatisticsService).to(StatisticsService).inSingletonScope();
container.bind<ValidationService>(SYMBOLS.ValidationService).to(ValidationService).inSingletonScope();
container.bind<SearchService>(SYMBOLS.SearchService).to(SearchService).inSingletonScope();
container.bind<SurveysService>(SYMBOLS.SurveysService).to(SurveysService).inSingletonScope();

export { container };
