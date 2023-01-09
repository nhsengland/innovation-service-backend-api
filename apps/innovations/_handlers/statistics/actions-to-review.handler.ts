import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { InnovationStatisticsParamsTemplateType, InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { InnovationsStatisticsHandler } from 'apps/innovations/_types/statistics-handlers.types';

export class ActionsToReviewStatisticsHandler extends InnovationsStatisticsHandler {

  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.ACTIONS_TO_REVIEW_COUNTER]
  ) { super(requestUser, domainContext, data) }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.ACTIONS_TO_REVIEW_COUNTER]> {

    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);

    const supports = await statisticsService.actionsToReview(this.data.innovationId, this.domainContext)

    return {
      count: supports.count,
      lastSubmittedSection: supports.lastSubmittedSection,
      lastSubmittedAt: supports.lastSubmittedAt,
    }
  }
}

