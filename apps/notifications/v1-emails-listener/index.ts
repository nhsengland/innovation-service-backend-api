import type { Context } from '@azure/functions';

import type { NotificationLogTypeEnum } from '@notifications/shared/enums';
import { JoiHelper } from '@notifications/shared/helpers';

import { container, EmailTypeEnum } from '../_config';

import type { DispatchService } from '../_services/dispatch.service';
import SYMBOLS from '../_services/symbols';
import { MessageSchema, MessageType } from './validation.schemas';

class V1SendEmailListener {
  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        type: EmailTypeEnum;
        to: string;
        params: { [key: string]: string | number };
        log: {
          type: NotificationLogTypeEnum;
          params: Record<string, string | number>;
        };
      };
    }
  ): Promise<void> {
    const dispatchService = container.get<DispatchService>(SYMBOLS.DispatchService);

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
