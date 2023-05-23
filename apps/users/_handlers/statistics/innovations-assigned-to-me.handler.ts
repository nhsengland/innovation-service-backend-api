import type { DomainContextType, DomainUserInfoType } from '@users/shared/types';
import { container } from '../../_config';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { UserStatisticsEnum } from '../../_enums/user.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';

export const innovationsAssignedToMeStatisticsHandler = async (
  requestUser: DomainUserInfoType,
  domainContext: DomainContextType
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.INNOVATIONS_ASSIGNED_TO_ME_COUNTER]> => {
  const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

  const innovations = await statisticsService.innovationsAssignedToMe(requestUser, domainContext);

  return {
    count: innovations.count,
    total: innovations.total,
    lastSubmittedAt: innovations.lastSubmittedAt
  };
};
