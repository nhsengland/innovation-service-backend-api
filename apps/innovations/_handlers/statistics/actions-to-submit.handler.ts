import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import type { UserTypeEnum } from '@innovations/shared/enums';
import { StatisticsServiceSymbol, StatisticsServiceType } from '../../_services/interfaces';
import { container } from '../../_config';
import type { InnovationStatisticsInputType, InnovationStatisticsTemplateType } from 'apps/innovations/_config/statistics.config';

export const actionsToSubmitStatisticsHandler = async (
  _: { id: string, identityId: string, type: UserTypeEnum },
  data: InnovationStatisticsInputType[InnovationStatisticsEnum.ACTIONS]
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const actions = await statisticsService.getUnsubmittedActions(data.innovationId);
  
    return {
      from: actions.from,
      total: actions.total,
      lastSubmittedAt: actions.lastSubmittedAt,
    }
}
