import type { Context } from '@azure/functions';

import { LoggerServiceSymbol, LoggerServiceType, StorageQueueServiceSymbol, StorageQueueServiceType } from '@notifications/shared/services';
import { QueuesEnum } from '@notifications/shared/services/integrations/storage-queue.service';
import type { NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { JoiHelper } from '@notifications/shared/helpers';

import { container } from '../_config';
import { HandlersHelper } from '../_helpers/handlers.helper';

import { MessageSchema, MessageType } from './validation.schemas';


class V1NotificationsListener {

  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        requestUser: { id: string, identityId: string, type: UserTypeEnum },
        action: NotifierTypeEnum,
        params: { [key: string]: any }
      }
    }
  ): Promise<void> {

    const loggerService = container.get<LoggerServiceType>(LoggerServiceSymbol);
    const storageQueueService = container.get<StorageQueueServiceType>(StorageQueueServiceSymbol);

    console.log('NOTIFICATION LISTENER: ', requestMessage);

    try {

      const message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);
      JoiHelper.Validate(HandlersHelper.handlerJoiDefinition(message.data.action), message.data.params);

      const notificationsInstance = await HandlersHelper.runHandler(message.data.requestUser, message.data.action, message.data.params);

      console.log('RESULT::Emails', notificationsInstance.getEmails());
      console.log('RESULT::InApp', notificationsInstance.getInApp());

      for (const item of notificationsInstance.getEmails()) {

        await storageQueueService.sendMessage(QueuesEnum.EMAIL, {
          data: {
            type: item.templateId,
            to: item.to,
            params: item.params,
            log: item.log,
          }
        });

      }


      for (const item of notificationsInstance.getInApp()) {

        await storageQueueService.sendMessage(QueuesEnum.IN_APP, {
          data: {
            requestUser: { id: message.data.requestUser.id },
            innovationId: item.innovationId,
            context: { type: item.context.type, detail: item.context.detail, id: item.context.id },
            userIds: item.userIds,
            params: item.params
          }
        });

      }

      context.res = { done: true };
      return;

    } catch (error) {
      loggerService.error('ERROR: Unexpected error parsing notification', error);
      context.res = { done: false, error };
      return;
    }

  }

}

export default V1NotificationsListener.queueTrigger;
