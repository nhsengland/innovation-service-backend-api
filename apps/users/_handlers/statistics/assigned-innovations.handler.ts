import type { UserStatisticsEnum } from '../../_enums/user.enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { UserTypeEnum } from '@users/shared/enums';

export const assignedInnovationsStatisticsHandler = async (
  requestUser: { id: string, identityId: string, type: UserTypeEnum },): Promise<UserStatisticsTemplateType[UserStatisticsEnum]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const actions = await statisticsService.assignedInnovations(requestUser.id);
  
    return {
      count: actions.count,
      total: actions.total,
      overdue: actions.overdue,
    }
}
