import type { Context } from '@azure/functions';

import { LoggerServiceSymbol, LoggerServiceType } from '@notifications/shared/services';
import type { NotificationContextTypeEnum, NotificationContextDetailEnum } from '@notifications/shared/enums';
import { JoiHelper } from '@notifications/shared/helpers';

import { container } from '../_config';
import { DispatchServiceSymbol, DispatchServiceType } from '../_services/interfaces';

import { MessageSchema, MessageType } from './validation.schemas';


class V1SendInAppListener {

  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        requestUser: { id: string },
        innovationId: string,
        context: { type: NotificationContextTypeEnum, detail: NotificationContextDetailEnum, id: string },
        userIds: string[];
        params: { [key: string]: string | number | string[] }
      }
    }
  ): Promise<void> {

    const loggerService = container.get<LoggerServiceType>(LoggerServiceSymbol);
    const dispatchService = container.get<DispatchServiceType>(DispatchServiceSymbol);

    console.log('IN APP LISTENER: ', requestMessage);

    try {

      const message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);

      await dispatchService.saveInAppNotification(
        message.data.requestUser,
        message.data.innovationId,
        message.data.context,
        message.data.userIds,
        message.data.params
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

export default V1SendInAppListener.queueTrigger;
