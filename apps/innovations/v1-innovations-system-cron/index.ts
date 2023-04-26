import { DomainServiceSymbol, DomainServiceType, LoggerServiceSymbol, LoggerServiceType } from '@innovations/shared/services';
import { container } from '../_config';


// Run every day at 01:00 (Summer Time) or 02:00 (Winter time)
class V1InnovationsSystemSchedule {

  static async cronTrigger(): Promise<void> {

    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);
    const logger = container.get<LoggerServiceType>(LoggerServiceSymbol);

    // Maybe organise this in a different way but using a single cron for all the jobs for now
    logger.log('Running cron job: V1InnovationsSystemSchedule');
    logger.log('Running cron job: V1InnovationsSystemSchedule - Withdraw Innovations');
    await domainService.innovations.withdrawExpiredInnovations();
    logger.log('Running cron job: V1InnovationsSystemSchedule - Cleanup Innovation documents');
    await domainService.innovations.cleanupInnovationDocuments();
    logger.log('Finished cron job: V1InnovationsSystemSchedule');
  }
}

export default V1InnovationsSystemSchedule.cronTrigger;
