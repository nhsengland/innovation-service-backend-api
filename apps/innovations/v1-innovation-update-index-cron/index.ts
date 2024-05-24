import { container } from '../_config';

import type { LoggerService, RedisService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { SearchService } from '../_services/search.service';
import SYMBOLS from '../_services/symbols';

// Runs every 30s
class V1InnovationUpdateIndexCron {
  static async cronTrigger(): Promise<void> {
    const searchService = container.get<SearchService>(SYMBOLS.SearchService);
    const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);
    const redisService = container.get<RedisService>(SHARED_SYMBOLS.RedisService);

    logger.log('Running cron job: V1InnovationUpdateIndexCron');

    try {
      let innovationId: string | null;
      while ((innovationId = await redisService.popFromSet('elasticsearch')) !== null) {
        await searchService.upsertDocument(innovationId);
        logger.log(`${innovationId} was reindexed.`);
      }
    } catch (err) {
      logger.error('Error running cron job: V1InnovationUpdateIndexCron', err);
      throw err;
    }

    logger.log('Finished cron job: V1InnovationUpdateIndexCron');
  }
}

export default V1InnovationUpdateIndexCron.cronTrigger;
