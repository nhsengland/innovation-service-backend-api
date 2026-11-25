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

export class UnreadMessagesThreadsInitiatedByStatisticsHandler extends InnovationsStatisticsHandler {
  constructor(
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER]
  ) {
    super(domainContext, data);
  }

  async run(): Promise<
    InnovationStatisticsTemplateType[InnovationStatisticsEnum.UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER]
  > {
    const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

    const actions = await statisticsService.getUnreadMessagesInitiatedBy(
      this.data.innovationId,
      this.domainContext.currentRole.id
    );

    return {
      count: actions.count,
      lastSubmittedAt: actions.lastSubmittedAt
    };
  }
}
