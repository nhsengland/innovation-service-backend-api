
import type { UserTypeEnum } from '@innovations/shared/enums';
import type { InnovationStatisticsEnum } from '../_enums/innovation.enums';
import type { InnovationStatisticsInputType, InnovationStatisticsTemplateType } from '../_types/innovation.types';

type HandlerInnovationStatisticsResponseType<T> = {
  innovationId: string;
  statistic: InnovationStatisticsEnum
  data: T;
} | null;

export abstract class BaseHandler<
  InnovationStatisticsType extends InnovationStatisticsEnum,
> {

  requestUser: { id: string, identityId: string, type: UserTypeEnum };
  inputData: InnovationStatisticsInputType[InnovationStatisticsType];

  private statistics: HandlerInnovationStatisticsResponseType<InnovationStatisticsTemplateType[InnovationStatisticsType]> = null;

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: InnovationStatisticsInputType[InnovationStatisticsType]
  ) {

    this.requestUser = requestUser;
    this.inputData = data;

  }

  abstract run(): Promise<this>;

  getStatistics(): HandlerInnovationStatisticsResponseType<InnovationStatisticsTemplateType[InnovationStatisticsType]> {
    return this.statistics;
  }

  setStatistics(statistics: HandlerInnovationStatisticsResponseType<InnovationStatisticsTemplateType[InnovationStatisticsType]>): void {
    this.statistics = statistics;
  }
  

}
