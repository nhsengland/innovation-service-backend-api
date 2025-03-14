import type { DomainContextType } from '@innovations/shared/types';
import { container } from '../../_config';

import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';
import type { UserStatisticsEnum } from 'apps/users/_enums/user.enums';
import type { UserStatisticsTemplateType } from 'apps/users/_config/statistics.config';

export const InnovationsNeedingActionStatisticsHandler = async (
  domainContext: DomainContextType
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.INNOVATIONS_NEEDING_ACTION_COUNTER]> => {
  const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

  const innovationsNeedingAction = await statisticsService.getCountInnovationsNeedingAction(domainContext);

  return { count: innovationsNeedingAction };
};
