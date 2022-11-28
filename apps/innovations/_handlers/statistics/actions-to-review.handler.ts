import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { DomainUserInfoType } from '@innovations/shared/types';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';

export const actionsToReviewStatisticsHandler = async (
  requestUser: DomainUserInfoType,
  data : { innovationId: string },
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.ACTIONS_TO_REVIEW_COUNTER]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const supports = await statisticsService.actionsToReview(data.innovationId, requestUser)
  
    return {
      count: supports.count,
      lastSubmittedAt: supports.lastSubmittedAt,
    }
}
