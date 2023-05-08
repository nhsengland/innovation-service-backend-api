import { container } from '../../_config';

import type {
  ADMIN_STATISTICS_CONFIG,
  ADMIN_STATISTICS_TYPES,
  StatisticsResponse
} from '../../_config/statistics.config';
import type { StatisticsService } from '../../_services/statistics.service';
import { SYMBOLS } from '../../_services/symbols';

export abstract class StatisticsHandler<T extends ADMIN_STATISTICS_TYPES> {
  data: ADMIN_STATISTICS_CONFIG[T]['payload'];
  statisticsService: StatisticsService;

  constructor(data: ADMIN_STATISTICS_CONFIG[T]['payload']) {
    this.data = data;
    this.statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);
  }

  abstract run(): Promise<StatisticsResponse<T>>;
}
