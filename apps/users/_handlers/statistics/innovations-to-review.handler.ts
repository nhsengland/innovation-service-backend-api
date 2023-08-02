import type { DomainContextType } from '@users/shared/types';
import { container } from '../../_config';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { UserStatisticsEnum } from '../../_enums/user.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';

export const innovationsToReviewStatisticsHandler = async (
  domainContext: DomainContextType
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.INNOVATIONS_TO_REVIEW_COUNTER]> => {
  const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

  const supports = await statisticsService.innovationsToReview(domainContext);

  return {
    count: supports.count,
    lastSubmittedAt: supports.lastSubmittedAt
  };
};
