import { container } from '../_config';

import type { DomainService, LoggerService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';

// Run every day at 02:00 (Summer Time) or 03:00 (Winter time)
class V1InnovationsSystemScheduleInnovationDocumentCleanup {
  static async cronTrigger(): Promise<void> {
    const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);
    const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);

    logger.log('Running cron job: V1InnovationsSystemSchedule - Cleanup Innovation documents');
    await domainService.innovations.cleanupInnovationDocuments();
    logger.log('Finished cron job: V1InnovationsSystemSchedule - Cleanup Innovation documents');
  }
}

export default V1InnovationsSystemScheduleInnovationDocumentCleanup.cronTrigger;
