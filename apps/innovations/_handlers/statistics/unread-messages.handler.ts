import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import type { UserTypeEnum } from '@innovations/shared/enums';
import { container } from 'apps/innovations/_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from 'apps/innovations/_services/interfaces';
import type { InnovationStatisticsInputType, InnovationStatisticsTemplateType } from 'apps/innovations/_config/statistics.config';

export const unreadMessagesStatisticsHandler = async (
  requestUser: { id: string, identityId: string, type: UserTypeEnum },
  data: InnovationStatisticsInputType[InnovationStatisticsEnum.MESSAGES]
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const actions = await statisticsService.getUnreadMessages(data.innovationId, requestUser.id);
  
    return {
      total: actions.total,
      lastSubmittedAt: actions.lastSubmittedAt,
    }
}
