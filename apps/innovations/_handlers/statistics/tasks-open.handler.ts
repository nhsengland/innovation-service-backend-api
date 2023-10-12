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

export class TasksOpenStatisticsHandler extends InnovationsStatisticsHandler {
  constructor(
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.TASKS_OPEN_COUNTER]
  ) {
    super(domainContext, data);
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.TASKS_OPEN_COUNTER]> {
    const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

    const openTasks = await statisticsService.getTasks(this.data.innovationId, [InnovationTaskStatusEnum.OPEN]);

    const lastRequestedTask = openTasks.find(_ => true);

    return {
      count: openTasks.length,
      lastSubmittedSection: lastRequestedTask?.section || null,
      lastSubmittedAt: lastRequestedTask?.updatedAt || null
    };
  }
}
