import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import { container } from '../../_config';
import type { InnovationStatisticsParamsTemplateType, InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { StatisticsServiceSymbol, type StatisticsServiceType } from '../../_services/interfaces';
import { InnovationsStatisticsHandler } from '../../_types/statistics-handlers.types';

export class UnreadMessagesThreadsInitiatedByStatisticsHandler extends InnovationsStatisticsHandler {

  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER]) {
    super(requestUser, domainContext, data)
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER]> {

    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const actions = await statisticsService.getUnreadMessagesInitiatedBy(this.data.innovationId, this.requestUser.id);
  
    return {
      count: actions.count,
      lastSubmittedAt: actions.lastSubmittedAt,
    }
  }
}
