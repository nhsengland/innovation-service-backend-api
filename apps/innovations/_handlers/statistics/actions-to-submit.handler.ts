import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { InnovationActionStatusEnum, UserTypeEnum } from '@innovations/shared/enums';
import { StatisticsServiceSymbol, StatisticsServiceType } from '../../_services/interfaces';
import { container } from '../../_config';
import type { InnovationStatisticsTemplateType } from '../../_config/statistics.config';

export const actionsToSubmitStatisticsHandler = async (
  _: { id: string, identityId: string, type: UserTypeEnum },
  data: { innovationId: string;}
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const requestedActions = await statisticsService.getActions(data.innovationId, [InnovationActionStatusEnum.REQUESTED]);
  
    const openActions = await statisticsService.getActions(data.innovationId, [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.IN_REVIEW]);

    const totalActions = [...requestedActions, ...openActions].length;

    return {
      total: totalActions,
      count:requestedActions.length,
      lastSubmittedAt: requestedActions.find(_ => true)?.updatedAt || null,
    }
}
