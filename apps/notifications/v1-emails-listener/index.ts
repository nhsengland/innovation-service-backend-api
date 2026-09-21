import type { Context } from '@azure/functions';

import { JoiHelper } from '@notifications/shared/helpers';

import type { EmailTemplates } from '../_config';
import { container } from '../_config';

import type { DispatchService } from '../_services/dispatch.service';
import SYMBOLS from '../_services/symbols';
import type { MessageType } from './validation.schemas';
import { MessageSchema } from './validation.schemas';

class V1SendEmailListener {
  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        type: keyof EmailTemplates;
        to: string;
        params: { [key: string]: string | number };
      };
    }
  ): Promise<void> {
    const dispatchService = container.get<DispatchService>(SYMBOLS.DispatchService);

    context.log.info('EMAIL LISTENER: ', JSON.stringify(requestMessage));

    try {
      const message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);

      await dispatchService.sendEmail(message.data.type, message.data.to, message.data.params);

      context.res = { done: true };
      return;
    } catch (error) {
      context.log.error('ERROR: Unexpected error parsing notification: ', JSON.stringify(error));
      throw error;
    }
  }
}

export default V1SendEmailListener.queueTrigger;
