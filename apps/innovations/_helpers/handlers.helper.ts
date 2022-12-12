import type { DomainUserInfoType } from '@innovations/shared/types';

import { InnovationStatisticsTemplateType, INNOVATION_STATISTICS_CONFIG } from '../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../_enums/innovation.enums';

export class StatisticsHandlersHelper {

  static async runHandler(
    requestUser: DomainUserInfoType,
    actions: InnovationStatisticsEnum[],
    params: { [key: string]: any }
  ): Promise<Record<string, InnovationStatisticsTemplateType[InnovationStatisticsEnum]>> {

    const handlers = actions.map(async (action) => {
      const handler = await INNOVATION_STATISTICS_CONFIG[action].handler(requestUser, params);
      
      return {
        data: { ...handler },
        action,
      };
    });

    const resolved = await  Promise.all(handlers);

    const result = this.buildResponse(resolved);

    return result;
  }

  private static buildResponse(
    statistics: { action: InnovationStatisticsEnum, data: (InnovationStatisticsTemplateType[InnovationStatisticsEnum])}[]): { [key: string]: InnovationStatisticsTemplateType[InnovationStatisticsEnum]; } {
  return statistics.reduce(
    (acc: { [key: string]: any; }, curr) => {
      if (curr) {
        acc[curr.action] = curr.data;
      }
      return acc;
    }, {});
}

}
