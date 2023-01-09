import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import type { UserTypeEnum } from '@innovations/shared/enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { InnovationStatisticsParamsTemplateType, InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import { InnovationsStatisticsHandler } from 'apps/innovations/_types/statistics-handlers.types';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';

export class UnreadMessagesStatisticsHandler extends InnovationsStatisticsHandler {

  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.UNREAD_MESSAGES_COUNTER]) {
    super(requestUser, domainContext, data)
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.UNREAD_MESSAGES_COUNTER]> {

    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const actions = await statisticsService.getUnreadMessages(this.data.innovationId, this.requestUser.id);
  
    return {
      count: actions.count,
      lastSubmittedAt: actions.lastSubmittedAt,
    }
  }
}

async (
  requestUser: { id: string, identityId: string, type: UserTypeEnum },
  data: { innovationId: string }
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.UNREAD_MESSAGES_COUNTER]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const actions = await statisticsService.getUnreadMessages(data.innovationId, requestUser.id);
  
    return {
      count: actions.count,
      lastSubmittedAt: actions.lastSubmittedAt,
    }
}
