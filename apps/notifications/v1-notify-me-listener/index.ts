import type { Context } from '@azure/functions';

import { JoiHelper } from '@notifications/shared/helpers';
import type { SQLConnectionService, StorageQueueService } from '@notifications/shared/services';
import { QueuesEnum } from '@notifications/shared/services/integrations/storage-queue.service';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';

import { container } from '../_config';

import type { MessageType } from './validation.schemas';
import { EventParamsSchema, MessageSchema } from './validation.schemas';

import { NotifyMeHandler } from '../_notify-me/notify-me.handler';
import type { NotifyMeService } from '../_services/notify-me.service';
import type { RecipientsService } from '../_services/recipients.service';
import SYMBOLS from '../_services/symbols';
import type { MessageType as EmailMessageType } from '../v1-emails-listener/validation.schemas';
import type { MessageType as InAppMessageType } from '../v1-in-app-listener/validation.schemas';

class V1NotifyMeListener {
  static async queueTrigger(context: Context, requestMessage: MessageType): Promise<void> {
    const storageQueueService = container.get<StorageQueueService>(SHARED_SYMBOLS.StorageQueueService);
    const recipientsService = container.get<RecipientsService>(SYMBOLS.RecipientsService);
    const notifyMeService = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);
    const sqlConnection = container.get<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService).getConnection();

    context.log.info('NOTIFY_ME LISTENER: ', JSON.stringify(requestMessage));

    try {
      const message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);
      JoiHelper.Validate(EventParamsSchema[message.data.type], message.data.params);

      const handler = new NotifyMeHandler(notifyMeService, recipientsService, message.data as any);

      await sqlConnection.transaction(async t => {
        await handler.execute(t);

        const emails = handler.emails;
        context.log.info('RESULT::Emails', JSON.stringify(emails));

        for (const item of emails) {
          await storageQueueService.sendMessage<EmailMessageType>(QueuesEnum.EMAIL, item);
        }

        const inApps = handler.inApps;
        context.log.info('RESULT::InApp', JSON.stringify(inApps));

        for (const item of inApps) {
          if (!item.data.userRoleIds.length) {
            continue;
          }
          await storageQueueService.sendMessage<InAppMessageType>(QueuesEnum.IN_APP, item);
        }

        context.res = { done: true };
      });
      return;
    } catch (error) {
      context.log.error('ERROR: Unexpected error parsing notification: ', JSON.stringify(error));
      throw error;
    }
  }
}

export default V1NotifyMeListener.queueTrigger;
