import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import type { UserTypeEnum } from '@innovations/shared/enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { InnovationStatisticsTemplateType } from '../../_config/statistics.config';

export const unreadMessagesThreadsInitiatedByStatisticsHandler = async (
  requestUser: { id: string, identityId: string, type: UserTypeEnum },
  data: { innovationId: string }
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const actions = await statisticsService.getUnreadMessages(data.innovationId, requestUser.id);
  
    return {
      count: actions.count,
      lastSubmittedAt: actions.lastSubmittedAt,
    }
}
