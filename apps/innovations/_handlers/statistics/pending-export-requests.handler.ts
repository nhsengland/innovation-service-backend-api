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

export class PendingExportRequestsStatisticsHandler extends InnovationsStatisticsHandler {
  constructor(
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.PENDING_EXPORT_REQUESTS_COUNTER]
  ) {
    super(domainContext, data);
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.PENDING_EXPORT_REQUESTS_COUNTER]> {
    const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

    const nPendingRequests = await statisticsService.getPendingExportRequests(this.data.innovationId);

    return { count: nPendingRequests };
  }
}
