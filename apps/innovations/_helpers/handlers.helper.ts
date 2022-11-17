import type { UserTypeEnum } from '@innovations/shared/enums';

import { INNOVATION_STATISTICS_CONFIG } from '../_config';
import type { InnovationStatisticsEnum } from '../_enums/innovation.enums';
import type { InnovationStatisticsTemplateType } from '../_types/innovation.types';


export class StatisticsHandlersHelper {

  static async runHandler(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    actions: InnovationStatisticsEnum[],
    params: { [key: string]: any }
  ): Promise<
    {
      [key: string]: {
          total: number;
          from: number;
          lastSubmittedAt: string | null;
      } | {
          total: number;
          from: number;
          lastSubmittedAt: string | null;
      } | {
          total: number;
          lastSubmittedAt: string | null;
      };
    }
  > {

    const handlers = actions.map((action) => {
      const handler = new INNOVATION_STATISTICS_CONFIG[action].handler(requestUser, params);
      return handler.run();
    });

    const resolved = await  Promise.all(handlers);

    const result = this.buildResponse(resolved.map(x => x.getStatistics()));

    return result;
  }

  private static buildResponse(
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
