import {
  DomainServiceSymbol,
  DomainServiceType,
  LoggerServiceSymbol,
  LoggerServiceType,
} from '@innovations/shared/services';
import { container } from '../_config';

// Run every day at 01:00 (Summer Time) or 02:00 (Winter time)
class V1InnovationsSystemScheduleWithdrawInnovations {
  static async cronTrigger(): Promise<void> {
    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);
    const logger = container.get<LoggerServiceType>(LoggerServiceSymbol);

    logger.log('Running cron job: V1InnovationsSystemSchedule - Withdraw Innovations');
    await domainService.innovations.withdrawExpiredInnovations();
    logger.log('Finished cron job: V1InnovationsSystemSchedule - Withdraw Innovations');
  }
}

export default V1InnovationsSystemScheduleWithdrawInnovations.cronTrigger;
