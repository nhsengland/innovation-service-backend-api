import type { UserStatisticsEnum } from '../../_enums/user.enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { DomainUserInfoType } from '@users/shared/types';


export const assignedInnovationsStatisticsHandler = async (requestUser: DomainUserInfoType): Promise<UserStatisticsTemplateType[UserStatisticsEnum.ASSIGNED_INNOVATIONS_COUNTER]> => {

  const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);

  const actions = await statisticsService.assignedInnovations(requestUser.id);

  return {
    count: actions.count,
    total: actions.total,
    overdue: actions.overdue,
  };

}
