import {
  DomainServiceSymbol,
  DomainServiceType,
  LoggerServiceSymbol,
  LoggerServiceType,
} from '@innovations/shared/services';
import { container } from '../_config';

// Run every day at 01:30 (Summer Time) or 02:30 (Winter time)
class V1InnovationsSystemScheduleExpireTransfer {
  static async cronTrigger(): Promise<void> {
    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);
    const logger = container.get<LoggerServiceType>(LoggerServiceSymbol);

    logger.log('Running cron job: V1InnovationsSystemSchedule - Expire Innovations Transfer');
    await domainService.innovations.withdrawExpiredInnovationsTransfers();
    logger.log('Finished cron job: V1InnovationsSystemSchedule - Expire Innovations Transfer');
  }
}

export default V1InnovationsSystemScheduleExpireTransfer.cronTrigger;
