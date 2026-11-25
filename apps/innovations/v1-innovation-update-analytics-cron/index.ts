import { container } from '../_config';

import type { LoggerService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { AnalyticsService } from '../_services/analytics.service';
import SYMBOLS from '../_services/symbols';

// Runs every day at 03:00
class V1InnovationUpdateAnalyticsCron {
  static async cronTrigger(): Promise<void> {
    const analyticsService = container.get<AnalyticsService>(SYMBOLS.AnalyticsService);
    const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);

    logger.log('Running cron job: V1InnovationUpdateAnalyticsCron');

    await analyticsService.updateAnalyticsOrgsInactivityBreach();

    logger.log('Finished cron job: V1InnovationUpdateAnalyticsCron');
  }
}

export default V1InnovationUpdateAnalyticsCron.cronTrigger;
