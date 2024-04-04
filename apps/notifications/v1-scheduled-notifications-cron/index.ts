import type { Context } from '@azure/functions';

import { JoiHelper } from '@notifications/shared/helpers';
import type { StorageQueueService } from '@notifications/shared/services';
import { QueuesEnum } from '@notifications/shared/services/integrations/storage-queue.service';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';

import { container } from '../_config';
import type { NotifyMeService } from '../_services/notify-me.service';
import SYMBOLS from '../_services/symbols';
import {
  MessageSchema as EmailMessageSchema,
  MessageType as EmailMessageType
} from '../v1-emails-listener/validation.schemas';
import {
  MessageSchema as InAppMessageSchema,
  MessageType as InAppMessageType
} from '../v1-in-app-listener/validation.schemas';
import { BadRequestError, GenericErrorsEnum } from '@notifications/shared/errors';

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
          // If is an error from Joi validation we consider the notification "handled"
          if (err instanceof BadRequestError && err.name === GenericErrorsEnum.INVALID_PAYLOAD) {
            handled.push(notification.subscriptionId);
          }
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
