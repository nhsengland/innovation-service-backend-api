import type { UserStatisticsEnum } from '../../_enums/user.enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { DomainContextType, DomainUserInfoType } from '@users/shared/types';


export const actionsToReviewStatisticsHandler = async (
  requestUser: DomainUserInfoType,
  domainContext: DomainContextType
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.ACTIONS_TO_REVIEW_COUNTER]> => {

  const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);

  const supports = await statisticsService.actionsToReview(requestUser, domainContext);

  return {
    count: supports.count,
    total: supports.total,
    lastSubmittedAt: supports.lastSubmittedAt,
  };

}
