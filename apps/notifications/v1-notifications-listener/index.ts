import type { Context } from '@azure/functions';

import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { JoiHelper } from '@notifications/shared/helpers';
import { StorageQueueServiceSymbol, StorageQueueServiceType } from '@notifications/shared/services';
import { QueuesEnum } from '@notifications/shared/services/integrations/storage-queue.service';
import type { DomainContextType } from '@notifications/shared/types';

import { container } from '../_config';
import { HandlersHelper } from '../_helpers/handlers.helper';

import { MessageSchema, MessageType } from './validation.schemas';


class V1NotificationsListener {

  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        requestUser: { id: string, identityId: string },
        action: NotifierTypeEnum,
        params: { [key: string]: any }
        domainContext?: DomainContextType,
      }
    }
  ): Promise<void> {

    const storageQueueService = container.get<StorageQueueServiceType>(StorageQueueServiceSymbol);

    context.log.info('NOTIFICATION LISTENER: ', JSON.stringify(requestMessage));

    try {

      const message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);
      JoiHelper.Validate(HandlersHelper.handlerJoiDefinition(message.data.action), message.data.params);

      const notificationsInstance = await HandlersHelper.runHandler(message.data.requestUser, message.data.action, message.data.params, message.data.domainContext) ;

      context.log.info('RESULT::Emails', JSON.stringify(notificationsInstance.getEmails()));
      context.log.info('RESULT::InApp', JSON.stringify(notificationsInstance.getInApp()));

      for (const item of notificationsInstance.getEmails()) {

        await storageQueueService.sendMessage(QueuesEnum.EMAIL, {
          data: {
            type: item.templateId,
            to: item.to,
            params: item.params,
            log: item.log,
            domainContext: message.data.domainContext,
          }
        });

      }


      for (const item of notificationsInstance.getInApp()) {

        await storageQueueService.sendMessage(QueuesEnum.IN_APP, {
          data: {
            requestUser: { id: message.data.requestUser.id },
            innovationId: item.innovationId,
            context: { type: item.context.type, detail: item.context.detail, id: item.context.id },
            users: item.users,
            params: item.params,
            domainContext: message.data.domainContext,
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
