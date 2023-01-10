import type { UserStatisticsEnum } from '../../_enums/user.enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { DomainContextType, DomainUserInfoType } from '@users/shared/types';

export const innovationsAssignedToMeStatisticsHandler = async (
  requestUser: DomainUserInfoType,
  domainContext: DomainContextType
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.INNOVATIONS_ASSIGNED_TO_ME_COUNTER]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const innovations = await statisticsService.innovationsAssignedToMe(requestUser, domainContext)
  
    return {
      count: innovations.count,
      total: innovations.total,
      lastSubmittedAt: innovations.lastSubmittedAt,
    }
}
