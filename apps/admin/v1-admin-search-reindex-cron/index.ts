import { container } from '../_config';

import type { LoggerService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { SearchService } from '../_services/search.service';
import SYMBOLS from '../_services/symbols';

// Run every day at 02:00 (Summer Time) or 03:00 (Winter time)
class V1AdminSearchReindexCron {
  static async cronTrigger(): Promise<void> {
    const searchService = container.get<SearchService>(SYMBOLS.SearchService);
    const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);

    try {
      logger.log('Running cron job: V1AdminSearchReindexCron');
      await searchService.createAndPopulateIndex();
      logger.log('Finished cron job: V1AdminSearchReindexCron');
    } catch (err) {
      logger.error('Error while running cron job: V1AdminSearchReindexCron', err);
    }
  }
}

export default V1AdminSearchReindexCron.cronTrigger;
