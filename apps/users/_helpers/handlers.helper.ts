import type { DomainContextType } from '@users/shared/types';
import { type UserStatisticsTemplateType, USER_STATISTICS_CONFIG } from '../_config/statistics.config';
import type { UserStatisticsEnum } from '../_enums/user.enums';

export class StatisticsHandlersHelper {
  static async runHandler(
    requestUser: { id: string; identityId: string },
    domainContext: DomainContextType,
    actions: UserStatisticsEnum[]
  ): Promise<Record<string, UserStatisticsTemplateType[UserStatisticsEnum]>> {
    const handlers = actions.map(async action => {
      const handler = await USER_STATISTICS_CONFIG[action].handler(requestUser, domainContext);

      return {
        data: { ...handler },
        action
      };
    });

    const resolved = await Promise.all(handlers);

    const result = this.buildResponse(resolved);

    return result;
  }

  private static buildResponse(
    statistics: {
      action: UserStatisticsEnum;
      data: UserStatisticsTemplateType[UserStatisticsEnum];
    }[]
  ): { [key: string]: UserStatisticsTemplateType[UserStatisticsEnum] } {
    return statistics.reduce((acc: { [key: string]: any }, curr) => {
      if (curr) {
        acc[curr.action] = curr.data;
      }
      return acc;
    }, {});
  }
}
