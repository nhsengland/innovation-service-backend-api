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

  const organisationUnitId = domainContext.organisation?.organisationUnit?.id;

  if (!organisationUnitId) {
    return { count: 0 };
  }

  const innovationsNotUpdated = await statisticsService.getInnovationsNotUpdatedForMoreThan30Days(organisationUnitId);

  const innovationsSuggestedForMoreThan3WorkDays =
    await statisticsService.getInnovationsSuggestedForMoreThan3WorkDays(organisationUnitId);

  const innovationsNeedingAction = innovationsNotUpdated.length + innovationsSuggestedForMoreThan3WorkDays.length;

  return { count: innovationsNeedingAction };
};
