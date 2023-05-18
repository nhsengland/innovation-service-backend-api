import { container } from '../_config';

import type { DomainService, LoggerService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';

// Run every day at 01:30 (Summer Time) or 02:30 (Winter time)
class V1InnovationsSystemScheduleExpireTransfer {
  static async cronTrigger(): Promise<void> {
    const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);
    const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);

    logger.log('Running cron job: V1InnovationsSystemSchedule - Expire Innovations Transfer');

    logger.log('Expire Innovations Transfer');
    try {
      await domainService.innovations.withdrawExpiredInnovationsTransfers();
    } catch (e) {
      logger.error('Error running cron job: V1InnovationsSystemSchedule - Expire Innovations Transfer', e);
    }

    logger.log('Remind pending Innovations Transfer 7 days before expiry');
    try {
      await domainService.innovations.remindInnovationsTransfers(7, 1);
    } catch (e) {
      logger.error('Error running cron job: V1InnovationsSystemSchedule - Innovations Transfer Reminder', e);
    }

    logger.log('Finished cron job: V1InnovationsSystemSchedule - Expire Innovations Transfer');
  }
}

export default V1InnovationsSystemScheduleExpireTransfer.cronTrigger;
