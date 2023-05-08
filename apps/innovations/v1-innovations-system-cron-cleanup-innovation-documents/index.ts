import {
  DomainServiceSymbol,
  DomainServiceType,
  LoggerServiceSymbol,
  LoggerServiceType
} from '@innovations/shared/services';
import { container } from '../_config';

// Run every day at 02:00 (Summer Time) or 03:00 (Winter time)
class V1InnovationsSystemScheduleInnovationDocumentCleanup {
  static async cronTrigger(): Promise<void> {
    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);
    const logger = container.get<LoggerServiceType>(LoggerServiceSymbol);

    logger.log('Running cron job: V1InnovationsSystemSchedule - Cleanup Innovation documents');
    await domainService.innovations.cleanupInnovationDocuments();
    logger.log('Finished cron job: V1InnovationsSystemSchedule - Cleanup Innovation documents');
  }
}

export default V1InnovationsSystemScheduleInnovationDocumentCleanup.cronTrigger;
