import type { Context } from '@azure/functions';

import type { NotificationCategoryType, NotificationDetailType } from '@notifications/shared/enums';
import { JoiHelper } from '@notifications/shared/helpers';

import { container } from '../_config';

import type { DispatchService } from '../_services/dispatch.service';
import SYMBOLS from '../_services/symbols';
import type { MessageType } from './validation.schemas';
import { MessageSchema } from './validation.schemas';

class V1SendInAppListener {
  static async queueTrigger(
    context: Context,
    requestMessage: {
      data: {
        requestUser: { id: string };
        innovationId: string;
        context: {
          type: NotificationCategoryType;
          detail: NotificationDetailType;
          id: string;
        };
        userRoleIds: string[];
        params: Record<string, unknown>;
      };
    }
  ): Promise<void> {
    const dispatchService = container.get<DispatchService>(SYMBOLS.DispatchService);

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
