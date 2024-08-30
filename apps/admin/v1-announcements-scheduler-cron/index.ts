import { container } from '../_config';

import type { LoggerService } from '@admin/shared/services';
import { ADMIN_CRON_ID } from '@admin/shared/constants';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import SYMBOLS from '../_services/symbols';
import type { AnnouncementsService } from '../_services/announcements.service';

// Runs every day at 1AM and 6AM.
class V1AnnouncementSchedulerCron {
  static async cronTrigger(): Promise<void> {
    const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);
    const announcementsService = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);

    logger.log('Running cron job: V1AnnouncementSchedulerCron');

    try {
      const announcements = await announcementsService.getAnnouncementsToActivate();
      for (const announcement of announcements) {
        await announcementsService.activateAnnouncement(ADMIN_CRON_ID, announcement, {});
      }
    } catch (err) {
      logger.error('Error running cron job: V1AnnouncementSchedulerCron', err);
      throw err;
    }

    logger.log('Finished cron job: V1AnnouncementSchedulerCron');
  }
}

export default V1AnnouncementSchedulerCron.cronTrigger;
