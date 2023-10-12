import { InnovationTaskStatusEnum } from '@users/shared/enums';
import type { DomainContextType } from '@users/shared/types';
import { container } from '../../_config';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { UserStatisticsEnum } from '../../_enums/user.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';

export const tasksRespondedStatisticsHandler = async (
  domainContext: DomainContextType
): Promise<UserStatisticsTemplateType[UserStatisticsEnum.TASKS_RESPONDED_COUNTER]> => {
  const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

  const tasks = await statisticsService.getTasksCounter(domainContext, [
    InnovationTaskStatusEnum.OPEN,
    InnovationTaskStatusEnum.DECLINED,
    InnovationTaskStatusEnum.DONE
  ]);

  return {
    count: tasks.DECLINED + tasks.DONE,
    total: tasks.OPEN + tasks.DECLINED + tasks.DONE,
    lastSubmittedAt: tasks.lastUpdatedAt
  };
};
