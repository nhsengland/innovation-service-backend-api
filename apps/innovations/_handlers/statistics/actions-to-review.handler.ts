import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import { container } from '../../_config';
import type { InnovationStatisticsParamsTemplateType, InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { StatisticsServiceSymbol, type StatisticsServiceType } from '../../_services/interfaces';
import { InnovationsStatisticsHandler } from '../../_types/statistics-handlers.types';

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

