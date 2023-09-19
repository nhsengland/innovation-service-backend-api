import type { DomainContextType } from '@users/shared/types';
import { container } from '../../_config';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { UserStatisticsEnum } from '../../_enums/user.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';

export const actionsToReviewStatisticsHandler = async (
  domainContext: DomainContextType
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.ACTIONS_TO_REVIEW_COUNTER]> => {
  const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

  const supports = await statisticsService.tasksOpen(domainContext);

  return {
    count: supports.count,
    total: supports.total,
    lastSubmittedAt: supports.lastSubmittedAt
  };
};
