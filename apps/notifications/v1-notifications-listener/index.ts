import type { Context } from '@azure/functions';

import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { JoiHelper } from '@notifications/shared/helpers';
import type { StorageQueueService } from '@notifications/shared/services';
import { QueuesEnum } from '@notifications/shared/services/integrations/storage-queue.service';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType } from '@notifications/shared/types';

import { container } from '../_config';
import { HandlersHelper } from '../_helpers/handlers.helper';

import { MessageSchema, MessageType } from './validation.schemas';

import type { MessageType as EmailMessageType } from '../v1-emails-listener/validation.schemas';
import type { MessageType as InAppMessageType } from '../v1-in-app-listener/validation.schemas';

class V1NotificationsListener {
  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        requestUser: DomainContextType;
        action: NotifierTypeEnum;
        params: { [key: string]: any };
      };
    }
  ): Promise<void> {
    const storageQueueService = container.get<StorageQueueService>(SHARED_SYMBOLS.StorageQueueService);

    context.log.info('NOTIFICATION LISTENER: ', JSON.stringify(requestMessage));

    try {
      const message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);
      JoiHelper.Validate(HandlersHelper.handlerJoiDefinition(message.data.action), message.data.params);

      const notificationsInstance = await HandlersHelper.runHandler(
        message.data.requestUser,
        message.data.action,
        message.data.params,
        context
      );

      const emails = await notificationsInstance.getEmails();
      context.log.info('RESULT::Emails', JSON.stringify(emails));

      for (const item of emails) {
        await storageQueueService.sendMessage<EmailMessageType>(QueuesEnum.EMAIL, {
          data: {
            type: item.templateId,
            to: item.to,
            params: item.params,
            log: item.log
          }
        });
      }

      const inApps = notificationsInstance.getInApp();
      context.log.info('RESULT::InApp', JSON.stringify(inApps));

      for (const item of inApps) {
        if (!item.userRoleIds.length) {
          continue;
        }

        await storageQueueService.sendMessage<InAppMessageType>(QueuesEnum.IN_APP, {
          data: {
            requestUser: { id: message.data.requestUser.id },
            innovationId: item.innovationId,
            context: { type: item.context.type as any, detail: item.context.detail, id: item.context.id },
            userRoleIds: item.userRoleIds,
            params: item.params
          }
        });
      }

      context.res = { done: true };
      return;
    } catch (error) {
      context.log.error('ERROR: Unexpected error parsing notification: ', JSON.stringify(error));
      throw error;
    }
  }
}

export default V1NotificationsListener.queueTrigger;
