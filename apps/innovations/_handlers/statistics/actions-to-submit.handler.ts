import { InnovationActionStatusEnum, UserTypeEnum } from '@innovations/shared/enums';
import { container } from '../../_config';
import type { InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { StatisticsServiceSymbol, StatisticsServiceType } from '../../_services/interfaces';

export const actionsToSubmitStatisticsHandler = async (
  _: { id: string, identityId: string, type: UserTypeEnum },
  data: { innovationId: string;}
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.ACTIONS_TO_SUBMIT_COUNTER]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const requestedActions = await statisticsService.getActions(data.innovationId, [InnovationActionStatusEnum.REQUESTED]);  
    
    const lastRequestedAction = requestedActions.find(_ => true)

    return {
      count:requestedActions.length,
      lastSubmittedSection: lastRequestedAction?.section || null,
      lastSubmittedAt: lastRequestedAction?.updatedAt || null,
    }
}
