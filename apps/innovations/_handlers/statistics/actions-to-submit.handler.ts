import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { InnovationActionStatusEnum } from '@innovations/shared/enums';
import { StatisticsServiceSymbol, StatisticsServiceType } from '../../_services/interfaces';
import { container } from '../../_config';
import type { InnovationStatisticsParamsTemplateType, InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import { InnovationsStatisticsHandler } from 'apps/innovations/_types/statistics-handlers.types';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';


export class ActionsToSubmitStatisticsHandler extends InnovationsStatisticsHandler {

  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.ACTIONS_TO_SUBMIT_COUNTER]
  ) { super(requestUser, domainContext, data) }
  
  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.ACTIONS_TO_SUBMIT_COUNTER]> {
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const requestedActions = await statisticsService.getActions(this.data.innovationId, [InnovationActionStatusEnum.REQUESTED]);  
    
    const lastRequestedAction = requestedActions.find(_ => true)

    return {
      count:requestedActions.length,
      lastSubmittedSection: lastRequestedAction?.innovationSection.section || null,
      lastSubmittedAt: lastRequestedAction?.updatedAt || null,
    }
  }
}
