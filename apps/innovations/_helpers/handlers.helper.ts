import type { UserTypeEnum } from '@innovations/shared/enums';

import { INNOVATION_STATISTICS_CONFIG } from '../_config';
import type { BaseHandler } from '../_handlers/statistics/base.handler';
import type { InnovationStatisticsEnum } from '../_enums/innovation.enums';
import type { InnovationStatisticsTemplateType } from '../_types/innovation.types';


export class StatisticsHandlersHelper {

  static async runHandler(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    action: InnovationStatisticsEnum,
    params: { [key: string]: any }
  ): Promise<BaseHandler<InnovationStatisticsEnum>> {

    return new INNOVATION_STATISTICS_CONFIG[action].handler(requestUser, params).run()

  }

  static buildResponse(
    statistics: ({ innovationId: string; statistic: InnovationStatisticsEnum; data:  InnovationStatisticsTemplateType[InnovationStatisticsEnum] } | null)[]): { [key: string]: InnovationStatisticsTemplateType[InnovationStatisticsEnum]; } {
  return statistics.reduce(
    (acc: { [key: string]: any; }, curr) => {
      if (curr) {
        acc[curr.statistic] = curr.data;
      }
      return acc;
    }, {});
}

}
