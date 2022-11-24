import type { UserStatisticsEnum } from '../../_enums/user.enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { DomainUserInfoType } from '@users/shared/types';

export const innovationsToReviewStatisticsHandler = async (
  requestUser: DomainUserInfoType,
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.INNOVATIONS_TO_REVIEW_COUNTER]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const supports = await statisticsService.innovationsToReview(requestUser)
  
    return {
      count: supports.count,
      lastSubmittedAt: supports.lastSubmittedAt,
    }
}
