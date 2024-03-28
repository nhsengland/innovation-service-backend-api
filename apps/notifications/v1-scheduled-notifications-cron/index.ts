import type { Context } from '@azure/functions';

import type { StorageQueueService } from '@notifications/shared/services';
import { QueuesEnum } from '@notifications/shared/services/integrations/storage-queue.service';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import { JoiHelper } from '@notifications/shared/helpers';

import { container } from '../_config';
import SYMBOLS from '../_services/symbols';
import {
  MessageSchema as EmailMessageSchema,
  MessageType as EmailMessageType
} from '../v1-emails-listener/validation.schemas';
import {
  MessageSchema as InAppMessageSchema,
  MessageType as InAppMessageType
} from '../v1-in-app-listener/validation.schemas';
import type { NotifyMeService } from '../_services/notify-me.service';

// Runs every 5 minutes
class V1ScheduledNotificationsCron {
  static async cronTrigger(context: Context): Promise<void> {
    const storageQueueService = container.get<StorageQueueService>(SHARED_SYMBOLS.StorageQueueService);
    const notifyMeService = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);

    context.log.info('V1ScheduledNotificationsCron is running');

    try {
      const notifications = await notifyMeService.getScheduledNotifications();

      context.log.info('RESULT::Sending', JSON.stringify(notifications));

      const handled: string[] = [];
      for (const notification of notifications) {
        try {
          const email = JoiHelper.Validate<EmailMessageType>(EmailMessageSchema, notification.params.email);
          await storageQueueService.sendMessage<EmailMessageType>(QueuesEnum.EMAIL, email);

          const inApp = JoiHelper.Validate<InAppMessageType>(InAppMessageSchema, notification.params.inApp);
          if (inApp.data.userRoleIds.length) {
            await storageQueueService.sendMessage<InAppMessageType>(QueuesEnum.IN_APP, inApp);
          }

          handled.push(notification.subscriptionId);
        } catch (err) {
          handled.push(notification.subscriptionId);
          context.log.error(`Error sending notification with subscriptionId: ${notification.subscriptionId}`, err);
        }
      }
      await notifyMeService.deleteScheduledNotifications(handled);
    } catch (err) {
      context.log.error('Error running cron job: V1ScheduledNotificationsCron', err);
    }
  }
}

export default V1ScheduledNotificationsCron.cronTrigger;
