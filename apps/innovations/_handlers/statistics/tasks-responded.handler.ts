import { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import type { DomainContextType } from '@innovations/shared/types';
import { container } from '../../_config';
import type {
  InnovationStatisticsParamsTemplateType,
  InnovationStatisticsTemplateType
} from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';
import { InnovationsStatisticsHandler } from '../../_types/statistics-handlers.types';

export class TasksRespondedStatisticsHandler extends InnovationsStatisticsHandler {
  constructor(
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.TASKS_RESPONDED_COUNTER]
  ) {
    super(domainContext, data);
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.TASKS_RESPONDED_COUNTER]> {
    const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

    const tasksStatus = [
      InnovationTaskStatusEnum.OPEN,
      InnovationTaskStatusEnum.DECLINED,
      InnovationTaskStatusEnum.DONE
    ];

    const tasks = await statisticsService.getTasksCounter(this.domainContext, this.data.innovationId, tasksStatus);

    const lastUpdatedTask = await statisticsService.getLastUpdatedTask(
      this.domainContext,
      this.data.innovationId,
      tasksStatus,
      { myTeam: true }
    );

    return {
      count: tasks.DONE + tasks.DECLINED,
      total: tasks.DONE + tasks.DECLINED + tasks.OPEN,
      lastUpdatedAt: lastUpdatedTask?.updatedAt ?? null,
      lastUpdatedSection: lastUpdatedTask?.section ?? null
    };
  }
}
