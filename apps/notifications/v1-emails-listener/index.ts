import type { Context } from '@azure/functions';

import { LoggerServiceSymbol, LoggerServiceType } from '@notifications/shared/services';
import { JoiHelper } from '@notifications/shared/helpers';

import { container, EmailTypeEnum } from '../_config';
import { DispatchServiceSymbol, DispatchServiceType } from '../_services/interfaces';

import { MessageSchema, MessageType } from './validation.schemas';
import type { NotificationLogTypeEnum } from '@notifications/shared/enums';


class V1SendEmailListener {

  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        type: EmailTypeEnum,
        to: { type: 'email' | 'identityId', value: string, displayNameParam?: string },
        params: { [key: string]: string | number },
        log: {
          type: NotificationLogTypeEnum,
          params: Record<string, string | number>,
        }
      }
    }
  ): Promise<void> {

    const loggerService = container.get<LoggerServiceType>(LoggerServiceSymbol);
    const dispatchService = container.get<DispatchServiceType>(DispatchServiceSymbol);

    console.log('EMAIL LISTENER: ', requestMessage);

    try {

      const message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);

      await dispatchService.sendEmail(
        message.data.type,
        message.data.to,
        message.data.params,
        message.data.log,
      );

      context.res = { done: true };
      return;

    } catch (error) {
      loggerService.error('ERROR: Unexpected error parsing notification', error);
      context.res = { done: false, error };
      return;
    }

  }

}

export default V1SendEmailListener.queueTrigger;
