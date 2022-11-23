import type { UserStatisticsEnum } from '../../_enums/user.enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { DomainUserInfoType } from '@users/shared/types';

export const actionsToReviewStatisticsHandler = async (
  requestUser: DomainUserInfoType,
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.INNOVATIONS_ASSIGNED_TO_ME]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const supports = await statisticsService.innovationsAssignedToMe(requestUser)
  
    return {
      count: supports.count,
      total: supports.total,
      lastSubmittedAt: supports.lastSubmittedAt,
    }
}
