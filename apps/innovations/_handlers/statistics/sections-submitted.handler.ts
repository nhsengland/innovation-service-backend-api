import { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { BaseHandler } from './base.handler';
import type { UserTypeEnum } from '@innovations/shared/enums';
import type { InnovationStatisticsInputType } from '../../_types/innovation.types';
import { container } from 'apps/innovations/_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from 'apps/innovations/_services/interfaces';
//import { container } from '../_config';
//import { InnovationActionsServiceSymbol, InnovationActionsServiceType } from '../_services/interfaces';

export class SectionsSubmittedStatisticsHandler extends BaseHandler<
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

    const sections = await this.statisticsService.getSubmittedSections(this.inputData.innovationId);

    this.setStatistics({
      innovationId: this.inputData.innovationId,
      statistic: InnovationStatisticsEnum.SECTIONS_SUBMITTED,
      data: {
        from: sections.from,
        total: sections.total,
        lastSubmittedAt: sections.lastSubmittedAt,
      }
    });

    return this;
  }

}