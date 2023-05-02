import type { DomainUserInfoType } from '@users/shared/types';
import { container } from '../../_config';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { UserStatisticsEnum } from '../../_enums/user.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';

export const assignedInnovationsStatisticsHandler = async (
  requestUser: DomainUserInfoType
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.ASSIGNED_INNOVATIONS_COUNTER]> => {
  const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

  const actions = await statisticsService.assignedInnovations(requestUser.id);

  return {
    count: actions.count,
    total: actions.total,
    overdue: actions.overdue,
  };
};
