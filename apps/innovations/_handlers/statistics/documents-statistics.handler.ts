import type { DomainContextType } from '@innovations/shared/types';
import { container } from '../../_config';
import type {
  InnovationStatisticsParamsTemplateType,
  InnovationStatisticsTemplateType
} from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';
import { InnovationsStatisticsHandler } from '../../_types/statistics-handlers.types';

export class DocumentsStatisticsHandler extends InnovationsStatisticsHandler {
  constructor(
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.DOCUMENTS_STATISTICS_COUNTER]
  ) {
    super(domainContext, data);
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.DOCUMENTS_STATISTICS_COUNTER]> {
    const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

    const statistics = await statisticsService.getDocumentsStatistics(this.data.innovationId);

    return {
      uploadedByRoles: statistics.uploadedByRoles,
      uploadedByUnits: statistics.uploadedByUnits,
      locations: statistics.locations
    };
  }
}
