import { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { BaseHandler } from './base.handler';
import type { UserTypeEnum } from '@innovations/shared/enums';
import type { InnovationStatisticsInputType } from '../../_types/innovation.types';
import { container } from 'apps/innovations/_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from 'apps/innovations/_services/interfaces';
//import { container } from '../_config';
//import { InnovationActionsServiceSymbol, InnovationActionsServiceType } from '../_services/interfaces';

export class UnreadMessagesStatisticsHandler extends BaseHandler<
  InnovationStatisticsEnum.UNREAD_MESSAGES
> {

  private statisticsService: StatisticsServiceType;

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: InnovationStatisticsInputType[InnovationStatisticsEnum.UNREAD_MESSAGES]
  ) {
    super(requestUser, data);
    this.statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  }
  
  async run(): Promise<this> {

    const unreadMessages = await this.statisticsService.getUnreadMessages(this.inputData.innovationId, this.requestUser.id);

    this.setStatistics({
      innovationId: this.inputData.innovationId,
      statistic: InnovationStatisticsEnum.UNREAD_MESSAGES,
      data: {
        total: unreadMessages.total,
        lastSubmittedAt: unreadMessages.lastSubmittedAt,
      }
    });

    return this;
  }

}