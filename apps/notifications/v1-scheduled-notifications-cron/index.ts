import type { Context } from '@azure/functions';

import { container } from '../_config';

import type { DomainService, NotifierService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType } from '@notifications/shared/types';
import type { NotifyMeService } from '../_services/notify-me.service';
import SYMBOLS from '../_services/symbols';

// Runs every 5 minutes
class V1ScheduledNotificationsCron {
  static async cronTrigger(context: Context): Promise<void> {
    const notifierService = container.get<NotifierService>(SHARED_SYMBOLS.NotifierService);
    const notifyMeService = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);
    const domainUsersService = container.get<DomainService>(SHARED_SYMBOLS.DomainService).users;

    context.log.info('V1ScheduledNotificationsCron is running');

    const notifications = await notifyMeService.getScheduledNotifications();

    context.log.info('RESULT::Sending', JSON.stringify(notifications));

    const roleCache = new Map<string, DomainContextType>();
    for (const notification of notifications) {
      if (!roleCache.has(notification.roleId)) {
        roleCache.set(notification.roleId, await domainUsersService.getDomainContextFromRole(notification.roleId));
      }
      const context = roleCache.get(notification.roleId);
      if (!context) {
        continue;
      }

      await notifierService.sendNotifyMe(context, notification.innovationId, notification.eventType, {});
      await notifyMeService.deleteScheduledNotification(notification.subscriptionId);
    }
  }
}

export default V1ScheduledNotificationsCron.cronTrigger;
