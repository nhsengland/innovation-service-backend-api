import { container } from '../_config';

import type { DomainService, LoggerService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';

// Run every day at 01:00 (Summer Time) or 02:00 (Winter time)
class V1InnovationsSystemScheduleWithdrawInnovations {
  static async cronTrigger(): Promise<void> {
    const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);
    const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);

    logger.log('Running cron job: V1InnovationsSystemSchedule - Withdraw Innovations');
    await domainService.innovations.withdrawExpiredInnovations();
    logger.log('Finished cron job: V1InnovationsSystemSchedule - Withdraw Innovations');
  }
}

export default V1InnovationsSystemScheduleWithdrawInnovations.cronTrigger;
