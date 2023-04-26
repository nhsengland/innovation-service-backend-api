import { InnovationActionStatusEnum } from '@innovations/shared/enums';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import { container } from '../../_config';
import type {
  InnovationStatisticsParamsTemplateType,
  InnovationStatisticsTemplateType,
} from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { StatisticsServiceSymbol, StatisticsServiceType } from '../../_services/interfaces';
import { InnovationsStatisticsHandler } from '../../_types/statistics-handlers.types';

export class ActionsToSubmitStatisticsHandler extends InnovationsStatisticsHandler {
  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.ACTIONS_TO_SUBMIT_COUNTER]
  ) {
    super(requestUser, domainContext, data);
  }

  async run(): Promise<
    InnovationStatisticsTemplateType[InnovationStatisticsEnum.ACTIONS_TO_SUBMIT_COUNTER]
  > {
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);

    const requestedActions = await statisticsService.getActions(this.data.innovationId, [
      InnovationActionStatusEnum.REQUESTED,
    ]);

    const lastRequestedAction = requestedActions.find((_) => true);

    return {
      count: requestedActions.length,
      lastSubmittedSection: lastRequestedAction?.section || null,
      lastSubmittedAt: lastRequestedAction?.updatedAt || null,
    };
  }
}
