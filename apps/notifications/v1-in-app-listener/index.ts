import type { Context } from '@azure/functions';

import type {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
} from '@notifications/shared/enums';
import { JoiHelper } from '@notifications/shared/helpers';

import { container } from '../_config';
import { DispatchServiceSymbol, DispatchServiceType } from '../_services/interfaces';

import { MessageSchema, MessageType } from './validation.schemas';

class V1SendInAppListener {
  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        requestUser: { id: string };
        innovationId: string;
        context: {
          type: NotificationContextTypeEnum;
          detail: NotificationContextDetailEnum;
          id: string;
        };
        userRoleIds: string[];
        params: { [key: string]: string | number | string[] };
      };
    }
  ): Promise<void> {
    const dispatchService = container.get<DispatchServiceType>(DispatchServiceSymbol);

    context.log.info('IN APP LISTENER: ', JSON.stringify(requestMessage));

    try {
      const message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);

      await dispatchService.saveInAppNotification(
        message.data.requestUser,
        message.data.innovationId,
        message.data.context,
        message.data.userRoleIds,
        message.data.params
      );

      context.res = { done: true };
      return;
    } catch (error) {
      context.log.error('ERROR: Unexpected error parsing notification: ', JSON.stringify(error));
      throw error;
    }
  }
}

export default V1SendInAppListener.queueTrigger;
