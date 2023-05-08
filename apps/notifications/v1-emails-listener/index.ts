import type { Context } from '@azure/functions';

import { JoiHelper } from '@notifications/shared/helpers';

import { container, EmailTypeEnum } from '../_config';
import { DispatchServiceSymbol, DispatchServiceType } from '../_services/interfaces';

import type { NotificationLogTypeEnum } from '@notifications/shared/enums';
import { MessageSchema, MessageType } from './validation.schemas';

class V1SendEmailListener {
  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        type: EmailTypeEnum;
        to: { type: 'email' | 'identityId'; value: string; displayNameParam?: string };
        params: { [key: string]: string | number };
        log: {
          type: NotificationLogTypeEnum;
          params: Record<string, string | number>;
        };
      };
    }
  ): Promise<void> {
    const dispatchService = container.get<DispatchServiceType>(DispatchServiceSymbol);

    context.log.info('EMAIL LISTENER: ', JSON.stringify(requestMessage));

    try {
      const message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);

      await dispatchService.sendEmail(message.data.type, message.data.to, message.data.params, message.data.log);

      context.res = { done: true };
      return;
    } catch (error) {
      context.log.error('ERROR: Unexpected error parsing notification: ', JSON.stringify(error));
      throw error;
    }
  }
}

export default V1SendEmailListener.queueTrigger;
