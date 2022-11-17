import { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { BaseHandler } from './base.handler';
import type { UserTypeEnum } from '@innovations/shared/enums';
import type { InnovationStatisticsInputType } from '../../_types/innovation.types';
import { StatisticsServiceSymbol, StatisticsServiceType } from '../../_services/interfaces';
import { container } from '../../_config';

export class ActionsToSubmitStatisticsHandler extends BaseHandler<
  InnovationStatisticsEnum.ACTIONS_TO_SUBMIT
> {

  private statisticsService: StatisticsServiceType;

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: InnovationStatisticsInputType[InnovationStatisticsEnum.ACTIONS_TO_SUBMIT]
  ) {
    super(requestUser, data);
    this.statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  }
  
  async run(): Promise<this> {

    const actions = await this.statisticsService.getUnsubmittedActions(this.inputData.innovationId);

    this.setStatistics({
      innovationId: this.inputData.innovationId,
      statistic: InnovationStatisticsEnum.ACTIONS_TO_SUBMIT,
      data: {
        from: actions.from,
        total: actions.total,
        lastSubmittedAt: actions.lastSubmittedAt,
      }
    });


    return this;
  }

}